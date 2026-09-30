export const BASE = 'https://flexozy.site';
export const checkTabs = {
  cURL: `curl -X POST ${BASE}/api/v1/slip/check \
  -H "x-api-key: fx_xxxxxxxx" \
  -F "image=@slip.jpg"`,
  JavaScript: `const form = new FormData();
form.append("image", fileOrBlob); // รูปสลิป PNG/JPG
const res = await fetch("${BASE}/api/v1/slip/check", {
  method: "POST",
  headers: { "x-api-key": "fx_xxxxxxxx" },
  body: form,
});
console.log((await res.json()).data.status); // ok | duplicate | suspicious | invalid`,
  Python: `import requests
r = requests.post("${BASE}/api/v1/slip/check",
    headers={"x-api-key": "fx_xxxxxxxx"},
    files={"image": open("slip.jpg", "rb")})
print(r.json()["data"])`,
};
export const createTabs = {
  cURL: `curl -X POST ${BASE}/api/v1/slip/create \\
  -H "x-api-key: fx_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"phone","target":"0812345678","amount":199.50}'`,
  JavaScript: `const res = await fetch("${BASE}/api/v1/slip/create", {
  method: "POST",
  headers: { "x-api-key": "fx_xxxxxxxx", "Content-Type": "application/json" },
  body: JSON.stringify({ type: "phone", target: "0812345678", amount: 199.5 }),
});
const { data } = await res.json();
console.log(data.link); // ลิงก์รูปแบบ =%fl#S!xxxx`,
  Python: `import requests
r = requests.post("${BASE}/api/v1/slip/create",
    headers={"x-api-key": "fx_xxxxxxxx"},
    json={"type": "phone", "target": "0812345678", "amount": 199.5})
print(r.json()["data"]["link"])`,
};
