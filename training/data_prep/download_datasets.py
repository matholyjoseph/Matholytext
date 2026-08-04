import os
import argparse
import logging
from datasets import load_dataset, DatasetDict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# List of 51 supported languages (ISO 639-1)
SUPPORTED_LANGS = [
    "en", "zh", "hi", "es", "fr", "ar", "bn", "pt", "ru", "ur",
    "id", "de", "ja", "sw", "mr", "te", "tr", "ta", "vi", "ko",
    "it", "th", "gu", "fa", "pl", "nl", "uk", "ms", "ro", "el",
    "he", "cs", "sv", "hu", "fi", "da", "no", "bg", "hr", "sr",
    "sk", "lt", "sl", "zu", "ha", "yo", "ig", "am", "ne", "pa", "si"
]

def download_opus_translation(output_dir: str):
    """Downloads OPUS-100 parallel datasets for high-resource and low-resource language pairs."""
    os.makedirs(output_dir, exist_ok=True)
    logger.info("Downloading OPUS parallel translation data...")
    
    # Sample download for selected pairs (e.g. en-es, en-hi, en-ar, en-zh, en-sw)
    sample_pairs = [("en", "es"), ("en", "hi"), ("en", "ar"), ("en", "zh"), ("en", "sw"), ("en", "am")]
    
    for src, tgt in sample_pairs:
        pair_name = f"{src}-{tgt}"
        logger.info(f"Fetching OPUS dataset pair: {pair_name}")
        try:
            ds = load_dataset("opus100", pair_name, split="train[:1000]")
            ds.to_json(os.path.join(output_dir, f"opus_{pair_name}.jsonl"))
        except Exception as e:
            logger.warning(f"Could not load OPUS pair {pair_name}: {e}")

def download_flores_benchmark(output_dir: str):
    """Downloads FLORES-200 evaluation benchmark dataset for multi-way evaluation."""
    os.makedirs(output_dir, exist_ok=True)
    logger.info("Downloading FLORES-200 benchmark evaluation dataset...")
    try:
        ds = load_dataset("facebook/flores", "all", split="dev[:100]")
        ds.to_json(os.path.join(output_dir, "flores_dev.jsonl"))
    except Exception as e:
        logger.warning(f"Could not download FLORES-200: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download Multilingual Datasets")
    parser.add_argument("--output_dir", type=str, default="./data/raw", help="Directory to save downloaded raw data")
    args = parser.parse_args()

    download_opus_translation(args.output_dir)
    download_flores_benchmark(args.output_dir)
    logger.info("Dataset downloading completed successfully.")
