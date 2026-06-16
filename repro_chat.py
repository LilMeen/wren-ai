import urllib.request, json, time, http.cookiejar

BASE="http://localhost:3000"
cj=http.cookiejar.CookieJar()
op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def post(path, body, ctype='application/json'):
    data=json.dumps(body).encode()
    req=urllib.request.Request(BASE+path, data=data, headers={'Content-Type':ctype})
    try:
        r=op.open(req); return r.status, json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def gql(query, variables=None):
    return post('/api/graphql', {'query':query,'variables':variables or {}})

# 1. signin
print("signin:", post('/api/auth/signin', {'email':'dev@email.com','password':'88888888'}))
# 2. select project
print("select:", post('/api/projects/select', {'projectId':1}))
# 3. createAskingTask
s,r=gql('mutation($data:AskingTaskInput!){createAskingTask(data:$data){id}}',
        {'data':{'question':'Top 5 parking lots with highest vehicles in'}})
print("createAskingTask:", s, r)
qid=r['data']['createAskingTask']['id']
# 4. poll askingTask
task=None
for _ in range(40):
    time.sleep(2)
    s,r=gql('query($taskId:String!){askingTask(taskId:$taskId){status type queryId candidates{sql type}}}',{'taskId':qid})
    task=r.get('data',{}).get('askingTask')
    if task and task['status'] in ('FINISHED','FAILED'): break
print("askingTask final:", json.dumps(task))
# 5. createThread with taskId
s,r=gql('mutation($data:CreateThreadInput!){createThread(data:$data){id}}',
        {'data':{'question':'Top 5 parking lots with highest vehicles in','taskId':qid}})
print("createThread:", s, json.dumps(r))
tid=r.get('data',{}).get('createThread',{}).get('id')
# 6. read thread to check sql binding
s,r=gql('query($threadId:Int!){thread(threadId:$threadId){responses{id sql askingTask{queryId status candidates{sql}}}}}',{'threadId':tid})
print("thread responses:", json.dumps(r))
