# Matholy Multilingual AI Assistant (51 Languages)

An enterprise-grade, end-to-end artificial intelligence system that understands, translates, converses, and teaches across **51 major world languages**.

---

## 🌟 Initial 51 Supported Languages

English, Mandarin Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, Urdu, Indonesian, German, Japanese, Swahili, Marathi, Telugu, Turkish, Tamil, Vietnamese, Korean, Italian, Thai, Gujarati, Persian, Polish, Dutch, Ukrainian, Malay, Romanian, Greek, Hebrew, Czech, Swedish, Hungarian, Finnish, Danish, Norwegian, Bulgarian, Croatian, Serbian, Slovak, Lithuanian, Slovenian, Zulu, Hausa, Yoruba, Igbo, Amharic, Nepali, Punjabi, Sinhala.

---

## 📁 Complete Folder Structure

```
matholychatbot/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat.py             # Chat endpoint & SSE streaming
│   │   │   ├── detector.py         # 51-language detection API
│   │   │   ├── feedback.py         # RLHF/DPO user feedback collection
│   │   │   ├── speech.py           # STT (Whisper) & TTS endpoints
│   │   │   ├── translate.py        # Accurate neural translation API
│   │   │   └── tutoring.py         # Grammar check & SM-2 flashcard API
│   │   ├── models/
│   │   │   └── schema.py           # SQLAlchemy ORM database models
│   │   ├── services/
│   │   │   ├── db_service.py       # CRUD & SM-2 algorithm engine
│   │   │   ├── docx_service.py     # Format-preserving DOCX XML translation engine
│   │   │   ├── llm_engine.py       # PyTorch, HF Transformers & LoRA engine
│   │   │   ├── nlp_service.py      # Language detection & script parser
│   │   │   ├── speech_service.py   # Whisper STT & neural TTS engine
│   │   │   ├── translation_engine.py # Multi-provider neural translation orchestrator
│   │   │   └── translation_providers.py # GoogleTranslate, Argos, MyMemory, Offline fallbacks
│   │   ├── config.py               # Settings & 51 language metadata
│   │   ├── database.py             # Async PostgreSQL connection engine
│   │   └── main.py                 # FastAPI application server entrypoint
│   └── requirements.txt
├── training/
│   ├── data_prep/
│   │   ├── download_datasets.py    # Multilingual OPUS & FLORES downloader
│   │   ├── prepare_instruction_data.py # Multi-task JSONL chat dataset generator
│   │   └── tokenizer_utils.py      # Script tokenizer & vocabulary audit
│   ├── fine_tuning/
│   │   ├── train_qlora.py          # PyTorch + PEFT QLoRA 4-bit fine-tuning
│   │   └── dpo_training.py         # Direct Preference Optimization alignment
│   ├── evaluation/
│   │   └── eval_multilingual.py    # SacreBLEU, chrF++, & ROUGE-L benchmark
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatBox.js          # Streaming chat & voice player component
│   │   │   className LanguageSelector.js # 51-language dropdown search selector
│   │   │   ├── LearningDashboard.js # SM-2 flashcards & learning analytics
│   │   │   └── VoiceRecorder.js    # Web Audio microphone recorder
│   │   ├── services/
│   │   │   └── api.js              # Axios backend API client
│   │   ├── styles/
│   │   │   └── globals.css         # Glassmorphism & dark mode CSS
│   │   ├── App.js                  # Main application component
│   │   └── index.js
│   └── package.json
└── deployment/
    ├── docker-compose.yml          # Multi-container production deployment
    ├── Dockerfile.backend
    └── Dockerfile.frontend
```

---

## ⚙️ Installation & Running Guide

### 1. Backend Setup (FastAPI + PyTorch)
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m app.main
```
FastAPI server will start on `http://localhost:8000`. Swagger API docs are available at `http://localhost:8000/docs`.

### 2. Frontend Setup (React / Next UI)
```bash
cd frontend
npm install
npm start
```
Frontend web app will launch on `http://localhost:3000`.

---

## 🎯 Phase-by-Phase Workflow

### Phase 1: Architecture & Core AI Engine
- FastAPI async server with CORS, SQLAlchemy 2.0 ORM PostgreSQL schema.
- Automatic 51-language detection (`backend/app/services/nlp_service.py`).
- PyTorch + HuggingFace Transformers inference engine (`backend/app/services/llm_engine.py`).

### Phase 2: Multilingual Datasets
```bash
cd training
python data_prep/download_datasets.py --output_dir ./data/raw
python data_prep/prepare_instruction_data.py --output_file ./data/processed/multilingual_instructions.jsonl
python data_prep/tokenizer_utils.py --model_name Qwen/Qwen2.5-7B-Instruct
```

### Phase 3: QLoRA Fine-Tuning & Evaluation
```bash
# Fine-tune foundation model with 4-bit QLoRA
python fine_tuning/train_qlora.py --model_name Qwen/Qwen2.5-7B-Instruct --output_dir ./models/qlora_adapter

# Run Direct Preference Optimization on feedback
python fine_tuning/dpo_training.py --feedback_dataset ./data/processed/dpo_pairs.jsonl

# Run evaluation benchmark
python evaluation/eval_multilingual.py --model_path ./models/qlora_adapter
```

### Phase 4: Voice Features (STT & TTS)
- OpenAI Whisper model for Speech-To-Text audio transcription.
- Neural TTS for audio synthesis in 51 languages.
- Web Audio API microphone component in React UI.

### Phase 6: Format-Preserving DOCX Translation Engine
The application processes Microsoft Word (`.docx`) files by opening the underlying OpenXML package directly and translating visible text inside `word/document.xml`, `word/header*.xml`, `word/footer*.xml`, `word/footnotes.xml`, `word/endnotes.xml`, and `word/comments.xml`.

Key preservation capabilities:
- **100% Layout & Styling Preservation**: Page sizes, margins, orientation (portrait/landscape), section breaks, page breaks, paragraph alignment, line spacing, and styles.
- **Run-Level Formatting Preservation**: Bold, italic, underline, strikethrough, font colors, font families, font sizes, highlighting, superscript, and subscript.
- **Structural Preservation**: Tables, merged cells, borders, shading, headers, footers, page numbers, footnotes, endnotes, hyperlinks, bookmarks, text boxes, and images.
- **RTL Support**: Automatic injection of `<w:bidi/>` in `<w:pPr>` and `<w:rtl/>` in `<w:rPr>` for Arabic, Hebrew, Urdu, and Persian.
- **Security & Validation**: ZIP bomb protection, Zip-Slip path sanitization, 50MB file size ceiling, and PK magic bytes validation.

---

## 🎯 Production Deployment
```bash
cd deployment
docker-compose up --build -d
```
Runs FastAPI backend, Next/React frontend, PostgreSQL database, and Redis cache in isolated containers.
