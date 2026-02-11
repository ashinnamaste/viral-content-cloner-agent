from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
from dotenv import load_dotenv
import threading
import google.generativeai as genai
from extractor import extract_viral_content

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure Gemini API
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Store extraction status
extraction_status = {
    'running': False,
    'progress': 0,
    'message': '',
    'status': 'idle'
}

# Store extracted subtitles in memory
extracted_subtitles = {
    'content': '',
    'videos_processed': 0
}

# System instructions for Gemini
VIRAL_DNA_SYSTEM_INSTRUCTION = """This file contains the transcripts of the top viral videos from a specific creator.
I want you to reverse-engineer their "Viral Algorithm."

Do NOT summarize the content. I don't care about the topic.
Focus 100% on the SYNTAX and PSYCHOLOGY.

Create a "Structural Style Guide" that includes:

1. THE HOOK ARCHITECTURE (0:00 - 0:30)
- How exactly do they start? (e.g., "They start with a visual contradiction," or "They ask a rhetorical question")
- What is the average word count before the first "cut" or topic shift?

2. THE RETENTION LOOPS
- Identify the specific phrases they use to keep people watching (e.g., "I'll show you that in a minute," or "But here is the catch").
- How frequently do they inject a "pattern interrupt"?

3. THE SENTENCE RHYTHM
- Analyze the sentence length. Are they short and punchy? Or long and descriptive?
- Give me 3 examples of "Transition Sentences" they use to move between points.

4. THE TEMPLATE
- Create a blank "Fill-in-the-Blanks" script template that follows their exact pacing structure, which I can use for ANY topic."""

VIRAL_SCRIPT_SYSTEM_INSTRUCTION = """# ROLE: THE VIRAL ARCHITECT
You are the world's most advanced viral scriptwriter. You do not write "content"; you engineer attention.

# KNOWLEDGE BASE: THE VIRAL DNA
{viral_dna}

# TASK PROTOCOL
When I give you a TOPIC, you will execute the following pipeline strictly in order. Do not skip steps.

## PHASE 1: THE DRAFT (The Architect)
Using the "Viral DNA" above, write a V1 script on the topic.
- Use the exact Hook Structure defined in the DNA.
- Match the Sentence Rhythm and Pacing.
- Insert the specific "Retention Loops" identified in the DNA.

## PHASE 2: THE ROAST (The Hostile Review)
Now, take that V1 script and run it through this mandatory validation protocol. *Do not show me the V1 script yet. Only show me the final result.*

**STEP 1: SPAWN 5 HOSTILE CONTENT REVIEWERS**
Simulate these 5 specific personas reviewing the draft:
1. **The Endless Scroller:** "What makes me NOT watch past 2 seconds?"
2. **The Seen-It-All Cynic:** "What feels derivative or recycled?"
3. **The Silent Judge:** "What is unclear or wasting my time?"
4. **The Share-Gatekeeper:** "Why would I be embarrassed to share this?"
5. **The Platform Native:** "What algorithm signals are missing?"

**STEP 2: FAIL & FIX**
For each reviewer, identify one CRITICAL FAILURE in the V1 draft.
* *Hook Failure:* Why did they scroll in 3 seconds?
* *Retention Drop:* Where did the pacing die?
* *Payoff Disappointment:* Why was the ending weak?

**STEP 3: REBUILD (The Fix)**
Rewrite the script to neutralize these objections.
- If the Hook was weak, replace it with a "Pattern Interrupt" from the Viral DNA.
- If the Middle dragged, cut 30% of the fluff.
- If the Ending was weak, add a "Twist" or "Call to Comment."

## PHASE 3: FINAL OUTPUT
Present the final, approved script in this format:

**[TITLE OPTIONS]**
1. (Clickbait Style)
2. (Curiosity Gap Style)
3. (Direct Benefit Style)

**[VISUAL HOOK]**
(Describe the first 3 seconds visually)

**[THE SCRIPT]**
(The final polished script with timestamp markers and visual cues)

**[VIRALITY CHECKLIST]**
- Hook Strategy Used: [Explain]
- Retention Loop Used: [Explain]
- Why the "Cynic" will watch this: [Explain]"""

def progress_callback(data):
    """Callback to send progress updates via WebSocket"""
    global extraction_status
    extraction_status.update(data)
    socketio.emit('progress', data)

def run_extraction(channel_url, limit):
    """Run extraction in a separate thread"""
    global extraction_status, extracted_subtitles
    extraction_status['running'] = True

    try:
        result = extract_viral_content(channel_url, limit, progress_callback)
        extraction_status['running'] = False

        # Store the extracted subtitles for later use
        if result and result.get('content'):
            extracted_subtitles['content'] = result['content']
            extracted_subtitles['videos_processed'] = result.get('videos_processed', 0)

        return result
    except Exception as e:
        extraction_status['running'] = False
        socketio.emit('progress', {
            'status': 'error',
            'message': f'Error: {str(e)}',
            'progress': 0
        })

@app.route('/api/extract', methods=['POST'])
def extract():
    """Start extraction process"""
    if extraction_status['running']:
        return jsonify({'error': 'Extraction already running'}), 400

    data = request.json
    channel_url = data.get('channel_url')
    limit = data.get('limit', 20)

    if not channel_url:
        return jsonify({'error': 'Channel URL is required'}), 400

    # Run extraction in background thread
    thread = threading.Thread(target=run_extraction, args=(channel_url, limit))
    thread.daemon = True
    thread.start()

    return jsonify({'message': 'Extraction started', 'status': 'started'})

@app.route('/api/status', methods=['GET'])
def status():
    """Get current extraction status"""
    return jsonify(extraction_status)

@app.route('/api/download', methods=['GET'])
def download():
    """Download the generated file"""
    file_path = 'viral_dna.txt'
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name='viral_dna.txt')
    return jsonify({'error': 'File not found'}), 404

@app.route('/api/subtitles', methods=['GET'])
def get_subtitles():
    """Get the extracted subtitles"""
    if not extracted_subtitles['content']:
        return jsonify({'error': 'No subtitles available. Please extract videos first.'}), 404
    return jsonify({
        'content': extracted_subtitles['content'],
        'videos_processed': extracted_subtitles['videos_processed']
    })

@app.route('/api/generate-viral-dna', methods=['POST'])
def generate_viral_dna():
    """Generate Viral DNA analysis using Gemini 2.0 Flash with thinking mode"""
    if not GEMINI_API_KEY:
        return jsonify({'error': 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.'}), 500

    data = request.json
    subtitles = data.get('subtitles', extracted_subtitles.get('content', ''))

    if not subtitles:
        return jsonify({'error': 'No subtitles provided'}), 400

    try:
        # Use Gemini 2.0 Flash with thinking mode
        model = genai.GenerativeModel(
            model_name='gemini-3-flash-preview',
            system_instruction=VIRAL_DNA_SYSTEM_INSTRUCTION
        )

        # Generate with thinking budget set to high
        generation_config = genai.GenerationConfig(
            temperature=1.0,
            max_output_tokens=8192,
        )

        # Generate the Viral DNA analysis
        response = model.generate_content(
            subtitles,
            generation_config=generation_config
        )

        return jsonify({
            'viral_dna': response.text,
            'success': True
        })
    except Exception as e:
        print(f"Gemini API error: {str(e)}")
        return jsonify({'error': f'Failed to generate Viral DNA: {str(e)}'}), 500

@app.route('/api/generate-script', methods=['POST'])
def generate_script():
    """Generate final viral script using Gemini 2.0 Flash with thinking mode"""
    if not GEMINI_API_KEY:
        return jsonify({'error': 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.'}), 500

    data = request.json
    viral_dna = data.get('viral_dna', '')
    topic = data.get('topic', '')

    if not viral_dna:
        return jsonify({'error': 'Viral DNA is required'}), 400
    if not topic:
        return jsonify({'error': 'Video topic is required'}), 400

    try:
        # Format the system instruction with the viral DNA
        system_instruction = VIRAL_SCRIPT_SYSTEM_INSTRUCTION.format(viral_dna=viral_dna)

        # Use Gemini 2.0 Flash with thinking mode
        model = genai.GenerativeModel(
            model_name='gemini-3-flash-preview',
            system_instruction=system_instruction
        )

        # Generate with thinking budget set to high
        generation_config = genai.GenerationConfig(
            temperature=1.0,
            max_output_tokens=8192,
        )

        # Generate the script with the user's topic
        response = model.generate_content(
            f"TOPIC: {topic}",
            generation_config=generation_config
        )

        return jsonify({
            'script': response.text,
            'success': True
        })
    except Exception as e:
        print(f"Gemini API error: {str(e)}")
        return jsonify({'error': f'Failed to generate script: {str(e)}'}), 500

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connected', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5002, allow_unsafe_werkzeug=True)
