import requests, json, time, sys

endpoint = 'http://74.48.140.178:27668/api/graphql'
question = sys.argv[1] if len(sys.argv) > 1 else 'Doanh thu cuoi tuan cao hon ngay thuong bao nhieu phan tram?'

create = requests.post(endpoint,
    json={'query': f'mutation {{ createAskingTask(data: {{ question: "{question}" }}) {{ id }} }}'},
    headers={'Content-Type': 'application/json'})
data = create.json()
if 'errors' in data:
    print('Create error:', data['errors'])
    sys.exit(1)
task_id = data['data']['createAskingTask']['id']
print('Task ID:', task_id)

for i in range(25):
    time.sleep(3)
    poll = requests.post(endpoint,
        json={'query': f'{{ askingTask(taskId: "{task_id}") {{ status error candidates {{ sql approach }} }} }}'},
        headers={'Content-Type': 'application/json'})
    result = poll.json()['data']['askingTask']
    status = result['status']
    print(f'[{i+1}] Status: {status}')
    if status in ('FINISHED', 'FAILED', 'STOPPED'):
        print('Error:', result.get('error'))
        candidates = result.get('candidates') or []
        print('Candidates:', len(candidates))
        for c in candidates:
            print('SQL:', c.get('sql','')[:500])
        break
