--[[
  KEY REMAINING — แสดงเวลาคีย์ที่เหลือจริงมุมขวาบน
  ใช้: วางไว้ในสคริปต์ของคุณ แก้ API_URL และส่งคีย์ที่ผู้ใช้กรอกเข้า KeyTimer.start(key)
  ฟังก์ชัน start คืน true ถ้าคีย์ใช้ได้ (และแสดง UI นับถอยหลัง) / false, เหตุผล ถ้าใช้ไม่ได้
]]

local API_URL = "https://YOUR-DOMAIN.vercel.app/api/verify" -- <<< แก้เป็นโดเมนของคุณ

local HttpService = game:GetService("HttpService")
local Players     = game:GetService("Players")
local RunService  = game:GetService("RunService")

local KeyTimer = {}
local gui, connection

-- Nh NNm NNs  (ชั่วโมงทั้งหมด ไม่แปลงเป็นวัน) เช่น 5h 03m 09s / 100h 00m 05s
local function format(sec)
	sec = math.max(0, math.floor(sec))
	return string.format("%dh %02dm %02ds", sec // 3600, (sec % 3600) // 60, sec % 60)
end

local function httpGet(url)
	local req = (syn and syn.request) or http_request or request or (http and http.request)
	if req then
		local ok, res = pcall(req, { Url = url, Method = "GET" })
		if ok and res then return res.StatusCode, res.Body end
		return nil, tostring(res)
	end
	local ok, body = pcall(function() return game:HttpGet(url) end) -- non-2xx จะ error → ถือว่าไม่ผ่าน
	return ok and 200 or nil, body
end

local function guiParent()
	local ok, h = pcall(function() return gethui and gethui() end)
	if ok and h then return h end
	local ok2, cg = pcall(function() return game:GetService("CoreGui") end)
	if ok2 and cg then return cg end
	return Players.LocalPlayer:WaitForChild("PlayerGui")
end

local function build()
	if gui then gui:Destroy() end
	gui = Instance.new("ScreenGui")
	gui.Name, gui.ResetOnSpawn, gui.IgnoreGuiInset = "KeyRemainingGui", false, true
	gui.Parent = guiParent()

	local frame = Instance.new("Frame")
	frame.AnchorPoint, frame.Position = Vector2.new(1, 0), UDim2.new(1, -12, 0, 12)
	frame.Size = UDim2.fromOffset(150, 46)
	frame.BackgroundColor3, frame.BackgroundTransparency = Color3.fromRGB(14, 16, 24), 0.15
	frame.BorderSizePixel = 0
	frame.Parent = gui
	Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 10)
	local stroke = Instance.new("UIStroke", frame)
	stroke.Color, stroke.Transparency = Color3.fromRGB(255, 255, 255), 0.88

	local title = Instance.new("TextLabel")
	title.BackgroundTransparency, title.Size, title.Position = 1, UDim2.new(1, 0, 0, 16), UDim2.fromOffset(0, 5)
	title.Font, title.TextSize, title.Text = Enum.Font.GothamBold, 10, "KEY REMAINING"
	title.TextColor3 = Color3.fromRGB(150, 155, 170)
	title.Parent = frame

	local time = Instance.new("TextLabel")
	time.BackgroundTransparency, time.Size, time.Position = 1, UDim2.new(1, 0, 0, 22), UDim2.fromOffset(0, 20)
	time.Font, time.TextSize, time.Text = Enum.Font.GothamBold, 17, "--"
	time.TextColor3 = Color3.fromRGB(255, 255, 255)
	time.Parent = frame
	return time
end

function KeyTimer.start(key)
	local status, body = httpGet(API_URL .. "?key=" .. HttpService:UrlEncode(tostring(key)))
	local ok, data = pcall(function() return HttpService:JSONDecode(body or "") end)
	if not ok or type(data) ~= "table" then return false, "bad_response" end
	if not data.valid or type(data.expiresAt) ~= "number" then return false, data.reason or "invalid" end

	local expiresAt = data.expiresAt          -- Unix timestamp (วินาที, UTC) จากเซิร์ฟเวอร์ — ไม่รีเซ็ตเมื่อเรียกซ้ำ
	local label = build()
	if connection then connection:Disconnect() end

	local last = -1
	local function tick()
		local remaining = expiresAt - os.time() -- Remaining = expiresAt - os.time()
		if remaining == last then return end
		last = remaining
		label.Text = format(remaining)
		if remaining <= 0 then
			label.TextColor3 = Color3.fromRGB(255, 70, 70)     -- หมดอายุ → แดง
		elseif remaining <= 300 then
			label.TextColor3 = Color3.fromRGB(255, 165, 40)    -- เหลือ ≤ 5 นาที → ส้ม
		else
			label.TextColor3 = Color3.fromRGB(255, 255, 255)
		end
	end
	tick()

	-- อัปเดตทุก 1 วินาที
	task.spawn(function()
		while gui and gui.Parent and label.Parent do
			tick()
			task.wait(1)
		end
	end)
	return true, expiresAt
end

return KeyTimer

--[[ ตัวอย่างใช้งาน
local KeyTimer = loadstring(game:HttpGet("https://YOUR-DOMAIN/roblox/KeyTimer.lua"))() -- หรือวางโค้ดนี้ไว้ในสคริปต์
local ok, info = KeyTimer.start(script_key)
if not ok then return warn("Key invalid:", info) end
]]
