from transformers import pipeline

translator = pipeline(
    "any-to-any",
    model="facebook/nllb-200-distilled-600M"
)

result = translator(
    "Hello, how are you?",
    src_lang="eng_Latn",
    tgt_lang="fra_Latn"
)

print(result)