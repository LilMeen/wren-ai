#!/usr/bin/env python3
from __future__ import annotations
import argparse,csv,hashlib,json,random,re,uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date,datetime,timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'data'; SCHEMA=ROOT/'starrock_schema.json'; RAW_DEV=DATA/'raw_dmp_public_device.csv'; CONFIG_DIR=ROOT/'configs'
def su(s): return str(uuid.UUID(hashlib.md5(str(s).encode()).hexdigest()))
def sk(s,p='sk'): return f"{p}_{hashlib.sha1(str(s).encode()).hexdigest()[:16]}"
def js(o): return json.dumps(o,ensure_ascii=False,separators=(',',':'))
def now(): return datetime.now().replace(microsecond=0).isoformat(sep=' ')
def ms(dt): return str(int(dt.timestamp()*1000))
def from_ms(v,fb):
    try: return datetime.fromtimestamp(int(v)/1000)
    except Exception: return fb
@dataclass
class Cfg:
    seed:int=42; device_count:int=150; asset_count:int=45; parking_lot_count:int=8; days:int=14; time_grain_minutes:int=15; vehicle_events_per_day:int=80; telemetry_events_per_device:int=24; connectivity_events_per_device:int=8; status_events_per_device:int=6; start_date:date=date(2026,6,1)
def schema_cols():
    out={}
    for full,m in json.loads(SCHEMA.read_text(encoding='utf-8')).items():
        t=full.split('.')[-1]; ddl=m['ddl']; cols=[]
        for line in ddl.splitlines():
            m1=re.match(r'\s*`([^`]+)`\s+',line)
            if m1: cols.append(m1.group(1))
        if not cols:
            m2=re.search(r'CREATE\s+MATERIALIZED\s+VIEW\s+`[^`]+`\s*\((.*?)\)\s*DISTRIBUTED',ddl,re.I|re.S)
            if m2: cols=re.findall(r'`([^`]+)`',m2.group(1))
        out[t]=cols
    return out
def read_raw_devices(n):
    with RAW_DEV.open(newline='',encoding='utf-8-sig') as f: rows=list(csv.DictReader(f))
    if len(rows)<n: raise SystemExit(f'Need {n} raw devices, got {len(rows)}')
    if n==len(rows): return rows
    step=(len(rows)-1)/max(n-1,1)
    return [rows[round(i*step)] for i in range(n)]
def write(t,rows,cols):
    if t=='raw_dmp_public_device': return
    with (DATA/f'{t}.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=cols[t],extrasaction='ignore'); w.writeheader()
        for r in rows: w.writerow({c:r.get(c,'') for c in cols[t]})
def build(devs,cfg):
    prof={}
    for d in devs:
        pid=d.get('device_profile_id') or su(d.get('type','generic'))
        prof.setdefault(pid,{'device_profile_id':pid,'device_profile_sk':sk(pid,'dpsk'),'name':d.get('type') or 'generic','tenant_id':d.get('tenant_id',''),'firmware_id':d.get('firmware_id',''),'software_id':d.get('software_id','')})
    aps=[{'asset_profile_id':su(f'ap{i}'),'asset_profile_sk':sk(f'ap{i}','apsk'),'name':n,'desc':f'Synthetic {n} profile'} for i,n in enumerate(['Building','Floor','Zone','Parking','Equipment'],1)]
    assets=[]
    for i in range(cfg.asset_count):
        p=aps[i%len(aps)]; d=devs[i%len(devs)]; aid=su(f'asset-{i+1:04d}')
        assets.append({'asset_id':aid,'asset_sk':sk(aid,'ask'),'asset_profile_id':p['asset_profile_id'],'asset_profile_name':p['name'],'asset_profile_description':p['desc'],'asset_profile_is_default':i%len(aps)==0,'asset_name':f'{p["name"].upper()}_{i+1:03d}','asset_label':f'{p["name"]} {i+1}','asset_type':p['name'].lower(),'asset_customer_id':d.get('customer_id',''),'asset_tenant_id':d.get('tenant_id',''),'asset_external_id':su(f'asset-ext-{i}')})
    lots=[{'pk_lot_id':f'LOT_{i:03d}','pk_lot_name':f'Parking Lot {i:03d}','area_id':f'AREA_{(i-1)//2+1:02d}'} for i in range(1,cfg.parking_lot_count+1)]
    dates=[cfg.start_date+timedelta(days=i) for i in range(cfg.days)]
    times=[]
    for h in range(24):
      for m in range(0,60,cfg.time_grain_minutes):
        per='night' if h<6 else 'morning' if h<12 else 'afternoon' if h<18 else 'evening'
        times.append({'time_key':f'{h:02d}{m:02d}','time_of_day':f'{h:02d}:{m:02d}:00','hour':h,'minute':m,'time_label':f'{h:02d}:{m:02d}','hour_label':f'{h:02d}:00','period':per,'time_of_day_label':f'{h:02d}:{m:02d}','minutes_since_midnight':h*60+m})
    return {'devs':devs,'dps':list(prof.values()),'aps':aps,'assets':assets,'lots':lots,'dates':dates,'times':times}

def gen_profiles(reg,cfg):
    raw=[]; stg=[]; dim=[]; n=now()
    for i,p in enumerate(reg['dps'],1):
        ca=datetime.combine(cfg.start_date-timedelta(days=30+i),datetime.min.time())
        r={'id':p['device_profile_id'],'created_time':ms(ca),'name':p['name'],'type':p['name'],'image':'','transport_type':'MQTT','provision_type':'DISABLED','profile_data':js({'telemetry':True,'sampleIntervalSec':60}),'description':f'Synthetic profile for {p["name"]}','is_default':i==1,'tenant_id':p['tenant_id'],'firmware_id':p['firmware_id'],'software_id':p['software_id'],'default_rule_chain_id':su('rule'+p['device_profile_id']),'default_dashboard_id':su('dash'+p['device_profile_id']),'default_queue_name':'Main','provision_device_key':sk(p['device_profile_id'],'prov'),'default_edge_rule_chain_id':'','external_id':'','version':1,'processing_day':cfg.start_date.isoformat()}
        raw.append(r); stg.append({**r,'device_profile_id':r['id'],'created_at':ca.isoformat(sep=' '),'_dbt_loaded_at':n})
        dim.append({'device_profile_sk':p['device_profile_sk'],'device_profile_id':r['id'],'device_profile_name':r['name'],'profile_type':r['type'],'transport_type':r['transport_type'],'provision_type':r['provision_type'],'profile_data':r['profile_data'],'device_profile_description':r['description'],'is_default':r['is_default'],'tenant_id':r['tenant_id'],'firmware_id':r['firmware_id'],'software_id':r['software_id'],'default_rule_chain_id':r['default_rule_chain_id'],'default_dashboard_id':r['default_dashboard_id'],'default_queue_name':'Main','default_edge_rule_chain_id':'','provision_device_key':r['provision_device_key'],'image':'','created_at':ca.isoformat(sep=' '),'_dbt_loaded_at':n})
    return raw,stg,dim

def gen_devices(reg,cfg):
    pmap={p['device_profile_id']:p for p in reg['dps']}; stg=[]; dim=[]; n=now()
    for d in reg['devs']:
        ca=from_ms(d.get('created_time',''),datetime.combine(cfg.start_date,datetime.min.time())); p=pmap.get(d.get('device_profile_id')) or reg['dps'][0]
        ai=d.get('additional_info') or js({'site':'demo','source':'raw_dmp_public_device'}); dd=d.get('device_data') or js({'configuration':{'pollingIntervalSec':60}})
        stg.append({**d,'device_id':d['id'],'additional_info':ai,'device_data':dd,'created_at':ca.isoformat(sep=' '),'_dbt_loaded_at':n})
        dim.append({'device_sk':sk(d['id'],'dsk'),'device_id':d['id'],'device_name':d.get('name',''),'device_label':d.get('label') or d.get('name',''),'device_type':d.get('type',''),'additional_info':ai,'device_data':dd,'customer_id':d.get('customer_id',''),'tenant_id':d.get('tenant_id',''),'firmware_id':d.get('firmware_id',''),'software_id':d.get('software_id',''),'external_id':d.get('external_id',''),'device_profile_id':d.get('device_profile_id',''),'device_profile_name':p['name'],'device_profile_description':f'Synthetic profile for {p["name"]}','transport_type':'MQTT','provision_type':'DISABLED','device_profile_is_default':False,'created_at':ca.isoformat(sep=' '),'_dbt_loaded_at':n})
    return stg,dim

def gen_assets(reg,cfg):
    rap=[]; sap=[]; dap=[]; ra=[]; sa=[]; da=[]; n=now()
    for i,p in enumerate(reg['aps'],1):
        ca=datetime.combine(cfg.start_date-timedelta(days=20+i),datetime.min.time()); tenant=reg['devs'][0].get('tenant_id','')
        r={'id':p['asset_profile_id'],'created_time':ms(ca),'name':p['name'],'image':'','description':p['desc'],'is_default':i==1,'tenant_id':tenant,'default_rule_chain_id':su('arule'+str(i)),'default_dashboard_id':su('adash'+str(i)),'default_queue_name':'Main','default_edge_rule_chain_id':'','external_id':'','version':1,'processing_day':cfg.start_date.isoformat()}
        rap.append(r); sap.append({**r,'asset_profile_id':r['id'],'created_at':ca.isoformat(sep=' '),'_dbt_loaded_at':n})
        dap.append({'asset_profile_sk':p['asset_profile_sk'],'asset_profile_id':p['asset_profile_id'],'asset_profile_name':p['name'],'asset_profile_description':p['desc'],'is_default':i==1,'tenant_id':tenant,'default_rule_chain_id':r['default_rule_chain_id'],'default_dashboard_id':r['default_dashboard_id'],'default_queue_name':'Main','default_edge_rule_chain_id':'','image':'','created_at':ca.isoformat(sep=' '),'_dbt_loaded_at':n})
    ap_by={r['id']:r for r in rap}
    for a in reg['assets']:
        ca=datetime.combine(cfg.start_date,datetime.min.time()); p=ap_by[a['asset_profile_id']]
        r={'id':a['asset_id'],'created_time':ms(ca),'additional_info':js({'synthetic':True,'area':a['asset_name']}),'customer_id':a['asset_customer_id'],'asset_profile_id':a['asset_profile_id'],'name':a['asset_name'],'label':a['asset_label'],'tenant_id':a['asset_tenant_id'],'type':a['asset_type'],'external_id':a['asset_external_id'],'version':1,'processing_day':cfg.start_date.isoformat()}
        ra.append(r); sa.append({**r,'asset_id':r['id'],'created_at':ca.isoformat(sep=' '),'_dbt_loaded_at':n})
        da.append({'asset_sk':a['asset_sk'],'asset_id':a['asset_id'],'asset_name':a['asset_name'],'asset_label':a['asset_label'],'asset_type':a['asset_type'],'additional_info':r['additional_info'],'customer_id':a['asset_customer_id'],'tenant_id':a['asset_tenant_id'],'external_id':a['asset_external_id'],'asset_profile_name':a['asset_profile_name'],'asset_profile_description':a['asset_profile_description'],'asset_profile_is_default':a['asset_profile_is_default'],'default_rule_chain_id':p['default_rule_chain_id'],'default_dashboard_id':p['default_dashboard_id'],'default_queue_name':'Main','default_edge_rule_chain_id':'','created_at':ca.isoformat(sep=' '),'_dbt_loaded_at':n})
    return rap,sap,dap,ra,sa,da

def gen_dates_times(reg):
    dd=[]
    for d in reg['dates']:
        dd.append({'date_key':d.strftime('%Y%m%d'),'date_day':d.isoformat(),'day_of_week':d.isoweekday(),'day_name':d.strftime('%A'),'day_of_month':d.day,'day_of_year':d.timetuple().tm_yday,'week_of_year':int(d.strftime('%V')),'month_number':d.month,'month_name':d.strftime('%B'),'quarter_number':(d.month-1)//3+1,'year_number':d.year,'is_weekend':d.weekday()>=5,'is_weekday':d.weekday()<5})
    return dd,reg['times']

def gen_rel(reg):
    rr=[]; sr=[]; br=[]; sn=[]; fa=[]; n=now()
    for i,d in enumerate(reg['devs']):
        a=reg['assets'][i%len(reg['assets'])]; info=js({'source':'synthetic','confidence':1.0})
        rr.append({'from_id':d['id'],'from_type':'DEVICE','to_id':a['asset_id'],'to_type':'ASSET','relation_type_group':'COMMON','relation_type':'Contains','additional_info':info,'version':1,'processing_day':reg['dates'][0].isoformat()}); sr.append({**rr[-1],'_dbt_loaded_at':n})
        row={'device_sk':sk(d['id'],'dsk'),'asset_sk':a['asset_sk'],'device_id':d['id'],'device_name':d.get('name',''),'device_label':d.get('label') or d.get('name',''),'device_type':d.get('type',''),'device_additional_info':d.get('additional_info') or js({'synthetic':True}),'device_data':d.get('device_data') or js({'configuration':{}}),'device_customer_id':d.get('customer_id',''),'device_tenant_id':d.get('tenant_id',''),'firmware_id':d.get('firmware_id',''),'software_id':d.get('software_id',''),'device_external_id':d.get('external_id',''),'device_profile_name':d.get('type',''),'device_profile_description':f'Synthetic profile for {d.get("type","")}','transport_type':'MQTT','provision_type':'DISABLED','device_profile_is_default':False,'device_created_at':from_ms(d.get('created_time',''),datetime.now()).isoformat(sep=' '),'asset_id':a['asset_id'],'asset_name':a['asset_name'],'asset_label':a['asset_label'],'asset_type':a['asset_type'],'asset_additional_info':js({'synthetic':True}),'asset_customer_id':a['asset_customer_id'],'asset_tenant_id':a['asset_tenant_id'],'asset_external_id':a['asset_external_id'],'asset_profile_name':a['asset_profile_name'],'asset_profile_description':a['asset_profile_description'],'asset_profile_is_default':a['asset_profile_is_default'],'default_rule_chain_id':su('rule'+a['asset_profile_id']),'default_dashboard_id':su('dash'+a['asset_profile_id']),'default_queue_name':'Main','default_edge_rule_chain_id':'','asset_created_at':datetime.combine(reg['dates'][0],datetime.min.time()).isoformat(sep=' '),'_dbt_loaded_at':n}
        br.append(row); sn.append({**row,'device_asset_sk':sk(d['id']+a['asset_id'],'dask'),'dbt_scd_id':sk('scd'+d['id']+a['asset_id'],'scd'),'dbt_updated_at':n,'dbt_valid_from':n,'dbt_valid_to':''})
        fa.append({'device_sk':row['device_sk'],'asset_sk':row['asset_sk'],'device_id':row['device_id'],'device_tenant_id':row['device_tenant_id'],'asset_id':row['asset_id'],'asset_tenant_id':row['asset_tenant_id'],'relation_type_group':'COMMON','relation_type':'Contains','relation_additional_info':info,'relation_version':1,'_dbt_loaded_at':n})
    return rr,sr,br,sn,fa

def gen_dev_events(reg,cfg,rng):
    rc=[]; sc=[]; se=[]; rt=[]; mv={k:[] for k in ['stg_mv_dmp_tlm_camera','stg_mv_dmp_tlm_chiller','stg_mv_dmp_tlm_energy_meter','stg_mv_dmp_tlm_nvr']}; n=now()
    for i,d in enumerate(reg['devs']):
        typ=(d.get('type') or '').lower()
        target='stg_mv_dmp_tlm_chiller' if 'chiller' in typ else 'stg_mv_dmp_tlm_energy_meter' if ('meter' in typ or 'energy' in typ) else 'stg_mv_dmp_tlm_nvr' if 'nvr' in typ else ['stg_mv_dmp_tlm_camera','stg_mv_dmp_tlm_chiller','stg_mv_dmp_tlm_energy_meter','stg_mv_dmp_tlm_nvr'][i%4]
        for j in range(cfg.connectivity_events_per_device):
            t=datetime.combine(cfg.start_date,datetime.min.time())+timedelta(hours=j*3,minutes=i%60); on=rng.random()>0.08
            r={'deviceId':d['id'],'tenantId':d.get('tenant_id',''),'ts':ms(t),'tsDt':t.isoformat(sep=' '),'msgType':'CONNECTIVITY','customerId':d.get('customer_id',''),'deviceCode':d.get('name',''),'status':'ONLINE' if on else 'OFFLINE','active':on,'heartbeatLevel':rng.choice(['GOOD','NORMAL','WARN']),'probeFailureReason':'' if on else 'TIMEOUT','offlineReason':'' if on else 'NO_HEARTBEAT','qualityScore':rng.randint(70,100) if on else rng.randint(10,55),'icmpReachable':on}
            rc.append(r); sc.append({'msgtype':r['msgType'],'deviceid':r['deviceId'],'tenantid':r['tenantId'],'customerid':r['customerId'],'devicecode':r['deviceCode'],'status':r['status'],'offlinereason':r['offlineReason'],'qualityscore':r['qualityScore'],'icmpreachable':r['icmpReachable'],'ts':r['ts'],'processing_day':cfg.start_date.isoformat()})
        prev='UNKNOWN'
        for j in range(cfg.status_events_per_device):
            t=datetime.combine(cfg.start_date,datetime.min.time())+timedelta(hours=j*4,minutes=i%45); cur=rng.choice(['ONLINE','ONLINE','ONLINE','OFFLINE','MAINTENANCE'])
            se.append({'event_id':su(f'status-{d["id"]}-{j}'),'device_id':d['id'],'tenant_id':d.get('tenant_id',''),'event_type':'STATUS_CHANGE' if cur!=prev else 'STATUS_HEARTBEAT','source_system':'DMP','device_code':d.get('name',''),'device_type':d.get('type',''),'ip_address':f'10.{i%255}.{j%255}.{rng.randint(2,254)}','current_status':cur,'previous_status':prev,'status_change_reason':'state transition','event_time':t.isoformat(sep=' '),'event_date':t.date().isoformat(),'event_hour':t.hour,'processing_day':cfg.start_date.isoformat(),'is_online':cur=='ONLINE','is_status_change_event':cur!=prev,'_dbt_loaded_at':n}); prev=cur
        for j in range(cfg.telemetry_events_per_device):
            t=datetime.combine(cfg.start_date,datetime.min.time())+timedelta(hours=j,minutes=i%60); base={'deviceId':d['id'],'ts':ms(t),'eventTime':t.isoformat(sep=' '),'tenantId':d.get('tenant_id',''),'customerId':d.get('customer_id',''),'tsDt':t.isoformat(sep=' ')}
            if target.endswith('chiller'): vals={'chiller_state':rng.choice(['ON','OFF','STANDBY']),'fault':rng.random()<0.03,'mode':rng.choice(['AUTO','MANUAL']),'return_valve_open_limit':rng.randint(40,90),'supply_valve_open_limit':rng.randint(40,90),'supply_valve_close_limit':rng.randint(5,30)}
            elif target.endswith('energy_meter'): vals={'current_a':round(rng.uniform(5,120),2),'energy_active_kwh_total':round(10000+i*50+j*rng.uniform(1,8),2),'energy_reactive_kvarh_total':round(1000+j*rng.uniform(.2,2),2),'frequency_hz':round(rng.uniform(49.8,50.2),2),'power_active_kw':round(rng.uniform(2,80),2),'power_factor':round(rng.uniform(.82,.99),2),'voltage_l1_v':round(rng.uniform(215,235),1),'voltage_l2_v':round(rng.uniform(215,235),1),'voltage_l3_v':round(rng.uniform(215,235),1),'water_volume_m3_total':round(500+j*rng.uniform(.1,1.5),2)}
            else:
                vals={'cpu_usage_pct':rng.randint(5,85),'memory_free_mb':rng.randint(512,4096),'memory_used_mb':rng.randint(512,4096),'uptime_seconds':rng.randint(3600,2592000)}
                if target.endswith('camera'): vals.update({'fan_state':rng.random()>.2,'heater_state':rng.random()<.2,'reboot_count_total':rng.randint(0,5)})
            mv[target].append({**base,**vals}); rt.append({'deviceId':d['id'],'tenantId':d.get('tenant_id',''),'ts':base['ts'],'tsDt':base['tsDt'],'source':'synthetic-generator','customerId':d.get('customer_id',''),'deviceType':target.replace('stg_mv_dmp_tlm_','').upper(),'mqttTopic':f'v1/devices/me/telemetry/{d["id"]}','telemetry':js(vals),'eventTime':base['eventTime']})
    return rc,sc,se,rt,mv

def gen_parking(reg,cfg,rng):
    raw=[]; stg=[]; facts=[]; snaps=[]; n=now(); vtypes=['CAR','MOTORBIKE','TRUCK','EV']; pays=['CASH','CARD','E_WALLET','MONTHLY_PASS']
    for l in reg['lots']: snaps.append({**l,'dbt_scd_id':sk(l['pk_lot_id'],'scd'),'dbt_updated_at':n,'dbt_valid_from':n,'dbt_valid_to':''})
    eid=0
    for d in reg['dates']:
      for _ in range(cfg.vehicle_events_per_day):
        eid+=1; lot=rng.choice(reg['lots']); vt=rng.choice(vtypes); im=rng.randint(360,1320); dur=rng.randint(20,480)
        ci=datetime.combine(d,datetime.min.time())+timedelta(minutes=im); co=ci+timedelta(minutes=dur); fee=0 if rng.random()<.15 else rng.choice([5000,10000,15000,20000,30000,50000]); id=su(f'parking-{eid}')
        b={'id':id,'event_id':id,'card_number':f'CARD{rng.randint(100000,999999)}','lpn':f'{rng.randint(10,99)}A-{rng.randint(10000,99999)}','lpn_cmp':'MATCH','lpn_camera_in':'','lpn_in_edited':'','lpn_camera_out':'','lpn_out_edited':'','service_id':f'SVC_{rng.randint(1,5):02d}','service_name':rng.choice(['Hourly Parking','Monthly Parking','Visitor Parking']),'service_category':rng.choice(['STANDARD','VIP','STAFF']),'owner_customer_id':su('parking-customer'),'org_unit_code':f'OU_{rng.randint(1,4):02d}','org_unit_name':'Demo Org Unit','pk_lot_id':lot['pk_lot_id'],'pk_lot_name':lot['pk_lot_name'],'area_id':lot['area_id'],'entry_point_in_id':'','entry_point_in_name':f'Gate In {rng.randint(1,3)}','lane_in_id':'','lane_in_name':f'Lane IN {rng.randint(1,6)}','entry_point_out_id':'','entry_point_out_name':f'Gate Out {rng.randint(1,3)}','lane_out_id':'','lane_out_name':f'Lane OUT {rng.randint(1,6)}','direction_type':'IN_OUT','check_in_at':ci.isoformat(sep=' '),'check_out_at':co.isoformat(sep=' '),'payment_type':rng.choice(pays),'use_voucher':rng.random()<.1,'wallet_balance_before':rng.randint(0,500000),'wallet_balance_after':rng.randint(0,500000),'total_topup':rng.choice([0,0,50000,100000]),'bank_transfer':fee if rng.random()<.3 else 0,'parking_fee':fee,'lost_card_fee':0 if rng.random()>.01 else 200000,'promotion_amount':rng.choice([0,0,5000,10000]),'promotion_vinfast_amount':0,'amount_due':max(fee-rng.choice([0,5000]),0),'used_change':0,'open_mode_in':rng.choice(['AUTO','MANUAL']),'open_mode_out':rng.choice(['AUTO','MANUAL']),'history_state':'COMPLETED','description':'','vehicle_type':vt,'park_duration':dur*60000,'park_duration_ms':dur*60000,'has_manual_edits':False,'check_in_note':'','check_out_note':'','is_exception':False,'created_by_user_id':'','created_by_username':'','last_modified_by_user_id':'','last_modified_by_username':'','checkin_customer_id':su('checkin-customer'),'checkout_customer_id':su('checkout-customer'),'created_at':ci.isoformat(sep=' '),'last_modified_at':co.isoformat(sep=' '),'processing_day':d.isoformat(),'_dbt_loaded_at':n}
        raw.append(b); stg.append(b); facts.append({**b,'parking_lot_id':lot['pk_lot_id'],'event_date':d.isoformat(),'check_in_timestamp':ms(ci),'check_out_timestamp':ms(co),'check_in_date_key':d.strftime('%Y%m%d'),'check_out_date_key':co.date().strftime('%Y%m%d'),'check_in_time_key':f'{ci.hour:02d}{(ci.minute//cfg.time_grain_minutes)*cfg.time_grain_minutes:02d}','check_out_time_key':f'{co.hour:02d}{(co.minute//cfg.time_grain_minutes)*cfg.time_grain_minutes:02d}'})
    return raw,stg,reg['lots'],snaps,facts

def gen_occ(facts):
    g=defaultdict(lambda:{'in':0,'out':0})
    for f in facts:
        g[(f['parking_lot_id'],f['vehicle_type'],f['check_in_date_key'],f['check_in_time_key'])]['in']+=1; g[(f['parking_lot_id'],f['vehicle_type'],f['check_out_date_key'],f['check_out_time_key'])]['out']+=1
    run=defaultdict(int); rows=[]; n=now()
    for k,v in sorted(g.items()):
        lot,vt,dk,tk=k; run[(lot,vt)]+=v['in']-v['out']
        rows.append({'parking_lot_id':lot,'vehicle_type':vt,'occupancy_hour':int(tk[:2]),'occupancy_date':f'{dk[:4]}-{dk[4:6]}-{dk[6:]}','occupancy_date_key':dk,'occupancy_time_key':tk,'vehicles_in':v['in'],'vehicles_out':v['out'],'current_occupancy':max(run[(lot,vt)],0),'_dbt_loaded_at':n})
    return rows

def validate(o):
    errs=[]; dev={r['device_id'] for r in o['dim_device']}; asset={r['asset_id'] for r in o['dim_asset']}; lots={r['pk_lot_id'] for r in o['dim_parking_lot']}; dates={r['date_key'] for r in o['dim_date']}; times={r['time_key'] for r in o['dim_time']}
    for t in ['raw_dmp_evt_connectivity','raw_dmp_tlm_raw']:
        miss=sum(1 for r in o[t] if r.get('deviceId') not in dev)
        if miss: errs.append(f'{t}: {miss} unknown deviceId')
    for t in ['dim_device_asset','fct_device_asset_assignment']:
        md=sum(1 for r in o[t] if r.get('device_id') not in dev); ma=sum(1 for r in o[t] if r.get('asset_id') not in asset)
        if md or ma: errs.append(f'{t}: missing dev={md} asset={ma}')
    for r in o['fct_vehicle_events']:
        if r.get('parking_lot_id') not in lots or r.get('check_in_date_key') not in dates or r.get('check_in_time_key') not in times: errs.append('fct_vehicle_events FK mismatch'); break
    if errs: raise SystemExit('Validation failed:\n'+'\n'.join(errs))

def generate(cfg,dry=False):
    rng=random.Random(cfg.seed); cols=schema_cols(); reg=build(read_raw_devices(cfg.device_count),cfg); o={}
    o['raw_dmp_public_device_profile'],o['stg_dmp_device_profiles'],o['dim_device_profile']=gen_profiles(reg,cfg)
    o['stg_dmp_devices'],o['dim_device']=gen_devices(reg,cfg)
    o['raw_dmp_public_asset_profile'],o['stg_dmp_asset_profiles'],o['dim_asset_profile'],o['raw_dmp_public_asset'],o['stg_dmp_assets'],o['dim_asset']=gen_assets(reg,cfg)
    o['dim_date'],o['dim_time']=gen_dates_times(reg)
    o['raw_dmp_public_relation'],o['stg_dmp_relations'],o['dim_device_asset'],o['dim_device_asset_snapshot'],o['fct_device_asset_assignment']=gen_rel(reg)
    o['raw_dmp_evt_connectivity'],o['stg_dmp_evt_connectivity'],o['stg_dmp_device_status_events'],o['raw_dmp_tlm_raw'],mv=gen_dev_events(reg,cfg,rng); o.update(mv)
    o['raw_parking_db_vehicle_histories'],o['stg_vehicle_histories'],o['dim_parking_lot'],o['dim_parking_lot_snapshot'],o['fct_vehicle_events']=gen_parking(reg,cfg,rng)
    o['fct_parking_occupancy']=gen_occ(o['fct_vehicle_events']); validate(o)
    if not dry:
        for t,r in o.items(): write(t,r,cols)
    return {t:len(r) for t,r in sorted(o.items())}

def parse_scalar(v):
    v=v.strip().strip('"').strip("'")
    if v.lower() in ('true','false'): return v.lower()=='true'
    try: return int(v)
    except ValueError: return v

def load_config(name):
    path=CONFIG_DIR/name
    if path.suffix=='': path=path.with_suffix('.yaml')
    if not path.exists(): raise SystemExit(f'Config not found: {path}')
    data={}
    for line in path.read_text(encoding='utf-8').splitlines():
        line=line.split('#',1)[0].strip()
        if not line or ':' not in line: continue
        k,v=line.split(':',1); data[k.strip()]=parse_scalar(v)
    return Cfg(
        seed=data.get('seed',42), device_count=data.get('device_count',150), asset_count=data.get('asset_count',45), parking_lot_count=data.get('parking_lot_count',8),
        days=data.get('days',14), time_grain_minutes=data.get('time_grain_minutes',15), vehicle_events_per_day=data.get('vehicle_events_per_day',80),
        telemetry_events_per_device=data.get('telemetry_events_per_device',24), connectivity_events_per_device=data.get('connectivity_events_per_device',8), status_events_per_device=data.get('status_events_per_device',6),
        start_date=date.fromisoformat(str(data.get('start_date','2026-06-01')))
    )

def main():
    p=argparse.ArgumentParser(); p.add_argument('config',nargs='?',default='config',help='config file name under database/scripts/configs'); p.add_argument('--dry-run',action='store_true'); a=p.parse_args()
    counts=generate(load_config(a.config),a.dry_run); print('Generated fake data (raw_dmp_public_device.csv unchanged):')
    for t,c in counts.items(): print(f'  {t}: {c} rows')
if __name__=='__main__': main()




