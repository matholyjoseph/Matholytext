import argparse
import logging
from transformers import AutoTokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SAMPLE_TEXTS = {
    "English": "Multilingual artificial intelligence bridges global communication.",
    "Mandarin": "多语言人工智能连接全球交流。",
    "Hindi": "बहुभाषी आर्टिफिशियल इंटेलिजेंस दुनिया को जोड़ता है।",
    "Arabic": "الذكاء الاصطناعي متعدد اللغات يربط التواصل العالمي.",
    "Russian": "Многоязычный искусственный интеллект объединяет мир.",
    "Amharic": "ብዙ ቋንቋ ተናጋሪ ሰራሽ አስተውሎት ዓለምን ያገናኛል።",
    "Sinhala": "බහුභාෂා කෘතිම බුද්ධිය ලෝකය සම්බන්ධ කරයි.",
    "Japanese": "多言語人工知能はグローバルなコミュニケーションを推進します。",
    "Bengali": "বহুভাষিক কৃত্রিম বুদ্ধিমত্তা বিশ্বব্যাপী যোগাযোগ বৃদ্ধি করে।"
}

def analyze_tokenizer_coverage(model_name: str):
    logger.info(f"Analyzing tokenizer vocabulary coverage for '{model_name}'...")
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    
    print(f"\n{'Language':<15} | {'Text Length':<12} | {'Tokens':<10} | {'Subword Ratio':<15}")
    print("-" * 60)
    for lang, text in SAMPLE_TEXTS.items():
        tokens = tokenizer.encode(text)
        subword_ratio = round(len(tokens) / max(1, len(text)), 2)
        print(f"{lang:<15} | {len(text):<12} | {len(tokens):<10} | {subword_ratio:<15}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze Tokenizer Vocabulary Coverage")
    parser.add_argument("--model_name", type=str, default="Qwen/Qwen2.5-7B-Instruct")
    args = parser.parse_args()

    analyze_tokenizer_coverage(args.model_name)
