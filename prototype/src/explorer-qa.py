import subprocess,json,sys
from pathlib import Path
import os
sys.stdout.reconfigure(encoding='utf-8')
entry=next((Path(os.environ['LOCALAPPDATA'])/'npm-cache'/'_npx').glob('*/node_modules/@playwright/mcp/cli.js'))
p=subprocess.Popen(['node',str(entry),'--headless','--isolated','--output-dir',str(Path('prototype/preview/explorer').resolve())],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,encoding='utf-8',shell=False)
n=0
def rpc(method,params):
 global n
 n+=1;p.stdin.write(json.dumps({'jsonrpc':'2.0','id':n,'method':method,'params':params})+'\n');p.stdin.flush()
 while True:
  line=p.stdout.readline()
  if not line: raise RuntimeError('MCP stopped')
  r=json.loads(line)
  if r.get('id')==n:return r
rpc('initialize',{'protocolVersion':'2024-11-05','capabilities':{},'clientInfo':{'name':'vysora-qa','version':'1'}})
p.stdin.write(json.dumps({'jsonrpc':'2.0','method':'notifications/initialized'})+'\n');p.stdin.flush()
if len(sys.argv)==1:
 result=rpc('tools/list',{})
 print(json.dumps(result,ensure_ascii=False))
else:
 for call in json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig')):
  r=rpc('tools/call',call);print(json.dumps(r,ensure_ascii=False))
p.terminate()

