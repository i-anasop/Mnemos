import json, sys, time, urllib.request

BASE = "http://localhost:3000"

def agent(query, session_id, user_id, workspace_id="mnemos-demo"):
    data = json.dumps({"query": query, "session_id": session_id, "user_id": user_id, "workspace_id": workspace_id}).encode()
    req = urllib.request.Request(BASE + "/api/agent", data=data, headers={"Content-Type": "application/json"})
    events = []
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=180) as r:
        for raw in r:
            line = raw.decode("utf-8", "ignore").strip()
            if line.startswith("data: "):
                try: events.append(json.loads(line[6:]))
                except: pass
    return events, round(time.time() - t0, 1)

def names(events): return [e["event"] for e in events]
def find(events, name): return next((e for e in events if e["event"] == name), None)

def memlist(user_id, workspace_id=None):
    url = f"{BASE}/api/memory?user_id={user_id}"
    if workspace_id: url += f"&workspace_id={workspace_id}"
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)["blobs"]

def blob(blob_id):
    data = json.dumps({"blob_id": blob_id}).encode()
    req = urllib.request.Request(BASE + "/api/memory", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "agent":
        ev, dt = agent(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv) > 5 else "mnemos-demo")
        print("EVENTS:", " ".join(names(ev)), f"({dt}s)")
        mc = find(ev, "memory_loaded"); ms = find(ev, "memory_selected")
        cr = find(ev, "casual_reply"); md = find(ev, "memory_decision")
        com = find(ev, "memory_committed"); sk = find(ev, "memory_skipped")
        sc = find(ev, "session_complete")
        if mc: print("  memory_loaded:", mc["count"])
        if ms:
            r = ms["retrievals"][0]
            print(f"  memory_selected[0]: ws={r['workspace_id']} score={r['cosine_score']:.2f} type={r.get('memory_type')} reason='{r['reason']}'")
        if md: print("  memory_decision:", json.dumps(md["decision"]))
        if com: print("  COMMITTED:", com["blob_id"], "type=", com.get("memory_type"), "imp=", com.get("importance"))
        if sk: print("  SKIPPED:", sk["reason"])
        if sc and sc.get("reply_mode"): print("  reply_mode:", sc["reply_mode"])
        if cr: print("  REPLY:", cr["text"][:220])
    elif cmd == "list":
        bl = memlist(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
        print(f"COUNT: {len(bl)}")
        for b in bl:
            print(f"  - ws={b.get('workspace_id')} type={b.get('memory_type')} imp={b.get('importance')} summary={str(b.get('summary'))[:70]}")
    elif cmd == "blob":
        print(json.dumps(blob(sys.argv[2]), indent=2)[:1400])
