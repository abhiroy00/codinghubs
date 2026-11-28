"""Original Coding Hubs retrieval exercise. Run: python3 rag-retrieval-demo.py

This is lexical retrieval, not an embedding model or a complete RAG application.
It makes no network calls, sends no data to an AI service and installs nothing.
Replace the fictional handbook with material you are authorized to use.
"""
import re

DOCUMENTS = {
    'library': 'The fictional college library opens at nine on weekdays.',
    'lab': 'The fictional computer lab requires a student card for entry.',
    'sports': 'The fictional sports centre closes at six on Saturdays.',
}


def retrieve(question, documents, limit=2):
    if limit < 1:
        raise ValueError('limit must be positive')
    tokens = set(re.findall(r'\w+', question.lower()))
    scored = [(len(tokens & set(re.findall(r'\w+', text.lower()))), key, text)
              for key, text in documents.items()]
    return [(key, text) for score, key, text in sorted(scored, reverse=True)[:limit] if score]


if __name__ == '__main__':
    matches = retrieve('What card is required for computer lab entry?', DOCUMENTS)
    assert matches[0][0] == 'lab'
    assert retrieve('volcano', DOCUMENTS) == []
    assert len(retrieve('library computer', DOCUMENTS, limit=1)) == 1
    for source, passage in matches:
        print(f'[{source}] {passage}')
    print('Next: use only these authorized passages as model context; cite sources and abstain when no passage supports an answer.')
