export const SITE = 'https://flexozy.site';
export const API_URL = `${SITE}/api/v15/lura.ph`;
export const TOOL_URL = `${SITE}/lura.ph/v15/deobfuscate`;
export const EXAMPLES = {
  cURL: `curl -X POST ${API_URL} \\
  -H "Content-Type: application/json" \\
  -d '{"code":"-- วางสคริปต์ที่ถูก obfuscate ตรงนี้"}'`,
  JavaScript: `const res = await fetch("${API_URL}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: luaSource }),
});
const data = await res.json();
console.log(data.output); // โค้ดที่ได้
console.log(data.logs);   // log การทำงาน`,
  Python: `import requests

r = requests.post("${API_URL}", json={"code": lua_source}, timeout=300)
data = r.json()
print(data["output"])`,
  Lua: `local HttpService = game:GetService("HttpService")
local res = request({
  Url = "${API_URL}",
  Method = "POST",
  Headers = { ["Content-Type"] = "application/json" },
  Body = HttpService:JSONEncode({ code = source }),
})
local data = HttpService:JSONDecode(res.Body)
print(data.output)`,
};
