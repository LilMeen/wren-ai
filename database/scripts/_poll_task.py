import requests, json, sys, time

endpoint = 'http://74.48.140.178:27668/api/graphql'
task_id = sys.argv[1]

for i in range(30):
    poll = requests.post(endpoint,
        json={'query': '{ askingTask(taskId: "%s") { status error candidates { sql approach } } }' % task_id},
        headers={'Content-Type': 'application/json'})
    resp = poll.json()
    if 'errors' in resp:
        print('GraphQL error:', resp['errors'])
        break
    result = resp['data']['askingTask']
    status = result['status']
    print(f'[{i}] Status: {status}')
    if status in ('FINISHED', 'FAILED', 'STOPPED'):
        print('Error:', result.get('error'))
        candidates = result.get('candidates') or []
        print('Candidates:', len(candidates))
        for c in candidates:
            print('Approach:', c.get('approach'))
            print('SQL:', c.get('sql', '')[:600])
        break
    time.sleep(3)
