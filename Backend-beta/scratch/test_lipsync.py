import requests, time

url = 'https://muscle-appearance-advice-congress.trycloudflare.com'
t0 = time.time()
print('Testing /synthesize_and_lipsync...')
r = requests.post(
    f'{url}/synthesize_and_lipsync',
    json={
        'text': 'Namaste, I am listening.',
        'speaker_name': 'test_maya',
        'avatar_id': 'test_dadaji',
        'num_step': 16,
        'stream': False
    },
    timeout=180
)
ct = r.headers.get("content-type")
print(f'Status: {r.status_code}, Elapsed: {time.time()-t0:.2f}s, Content-Type: {ct}')
if r.status_code == 200:
    print('Video size:', len(r.content), 'bytes')
    with open('scratch/test_lipsync_result.mp4', 'wb') as f:
        f.write(r.content)
    print('Saved to scratch/test_lipsync_result.mp4')
else:
    print('Response:', r.text[:400])
