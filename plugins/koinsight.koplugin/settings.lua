local _ = require("gettext")
local BD = require("ui/bidi")
local DataStorage = require("datastorage")
local InfoMessage = require("ui/widget/infomessage")
local logger = require("logger")
local LuaSettings = require("luasettings")
local MultiInputDialog = require("ui/widget/multiinputdialog")
local UIManager = require("ui/uimanager")
local Menu = require("ui/widget/menu")

local KoInsightSettings = {
  settings = nil, -- LuaSettings handle
  data = nil, -- in-memory normalized table
}
KoInsightSettings.__index = KoInsightSettings

local SETTING_KEY = "koinsight"
local DEFAULTS = {
  server_url = "",
  sync_on_suspend = true,
  aggressive_suspend_sync = false,
  suspend_connect_timeout_s = 10, -- clamped to [3, 60]
}

local function open_settings_handle()
  local path = DataStorage:getSettingsDir() .. "/" .. SETTING_KEY .. ".lua"
  return LuaSettings:open(path)
end

-- small helper function to clamp numeric values, e.g. timeout
local function clamp(v, lo, hi)
  if v < lo then
    return lo
  end
  if v > hi then
    return hi
  end
  return v
end

function KoInsightSettings:new()
  local obj = setmetatable({}, self)
  obj.settings = open_settings_handle()
  -- Safe initialization with error handling
  local success, result = pcall(function()
    return obj.settings:readSetting(SETTING_KEY, {}) or {}
  end)
  if success then
    obj.data = result
  else
    logger.err("[KoInsight] Error reading settings, using defaults:", result)
    obj.data = {}
  end
  return obj
end

-- optional for now, if we ever want to re-read from disk
function KoInsightSettings:reload()
  local success, result = pcall(function()
    return self.settings:readSetting(SETTING_KEY, {}) or {}
  end)
  if success then
    self.data = result
  else
    logger.err("[KoInsight] Error reloading settings:", result)
  end
end

function KoInsightSettings:writeData()
  local success, error_msg = pcall(function()
    if not self.settings then
      logger.err("[KoInsight] No settings object available for write")
      return false
    end
    logger.dbg("[KoInsight] Saving settings data:", self.data)
    self.settings:saveSetting(SETTING_KEY, self.data)
    self.settings:flush()
    logger.dbg("[KoInsight] Settings saved and flushed successfully")
    return true
  end)

  if not success then
    logger.err("[KoInsight] Error writing settings:", error_msg)
    return false
  end
  return true
end

function KoInsightSettings:update(patch)
  for k, v in pairs(patch or {}) do
    logger.dbg("[KoInsight] Updating setting:", k, "=", v)
    self.data[k] = v
  end
  return self:writeData()
end

-- getters/setters
function KoInsightSettings:getServerURL()
  return self.data.server_url or DEFAULTS.server_url
end
function KoInsightSettings:setServerURL(url)
  url = tostring(url or ""):gsub("/*$", "")
  self:update({ server_url = url })
end

function KoInsightSettings:getSyncOnSuspendEnabled()
  local value = self.data.sync_on_suspend
  if value == nil then
    logger.dbg("[KoInsight] sync_on_suspend not set, using default:", DEFAULTS.sync_on_suspend)
    return DEFAULTS.sync_on_suspend
  end
  return value
end
function KoInsightSettings:setSyncOnSuspendEnabled(enabled)
  return self:update({ sync_on_suspend = (enabled == true) })
end
function KoInsightSettings:toggleSyncOnSuspend()
  local current = self:getSyncOnSuspendEnabled()
  local new_value = not current
  local success = self:setSyncOnSuspendEnabled(new_value)

  if success then
    local message = new_value and _("已启用休眠时同步") or _("已禁用休眠时同步")
    UIManager:show(InfoMessage:new({ text = message, timeout = 2 }))
    logger.info("[KoInsight] Sync on suspend toggled from", current, "to", new_value)
  else
    UIManager:show(InfoMessage:new({ text = _("切换同步设置时出错"), timeout = 3 }))
    logger.err("[KoInsight] Failed to toggle sync_on_suspend")
  end

  return success
end

function KoInsightSettings:getAggressiveSuspendEnabled()
  local value = self.data.aggressive_suspend_sync
  if value == nil then
    logger.dbg(
      "[KoInsight] aggressive_suspend_sync not set, using default:",
      DEFAULTS.aggressive_suspend_sync
    )
    return DEFAULTS.aggressive_suspend_sync
  end
  return value
end
function KoInsightSettings:setAggressiveSuspendEnabled(enabled)
  return self:update({ aggressive_suspend_sync = (enabled == true) })
end
function KoInsightSettings:toggleAggressiveSuspend()
  local current = self:getAggressiveSuspendEnabled()
  local new_value = not current
  local success = self:setAggressiveSuspendEnabled(new_value)

  if success then
    local message = new_value and _("已启用休眠时强力同步")
      or _("已禁用休眠时强力同步")
    UIManager:show(InfoMessage:new({ text = message, timeout = 2 }))
    logger.info("[KoInsight] Aggressive suspend sync toggled from", current, "to", new_value)
  else
    UIManager:show(
      InfoMessage:new({ text = _("切换强力同步设置时出错"), timeout = 3 })
    )
    logger.err("[KoInsight] Failed to toggle aggressive_suspend_sync")
  end

  return success
end

function KoInsightSettings:getSuspendConnectTimeout()
  local t = tonumber(self.data.suspend_connect_timeout_s)
  -- if it's an actual number, not nan
  if not (t and t == t) then
    logger.dbg(
      "[KoInsight] suspend_connect_timeout_s not valid, using default:",
      DEFAULTS.suspend_connect_timeout_s
    )
    return DEFAULTS.suspend_connect_timeout_s
  end
  return clamp(t, 3, 60)
end
function KoInsightSettings:setSuspendConnectTimeout(sec)
  local t = tonumber(sec)
  -- if it's an actual number, not nan
  if not (t and t == t) then
    logger.warn("[KoInsight] Invalid timeout value, using default:", sec)
    t = DEFAULTS.suspend_connect_timeout_s
  end
  t = clamp(t, 3, 60)
  return self:update({ suspend_connect_timeout_s = t })
end

function KoInsightSettings:editServerSettings()
  self.settings_dialog = MultiInputDialog:new({
    title = _("KoInsight 设置"),
    fields = {
      {
        text = self.data.server_url,
        description = _("服务器 URL："),
        hint = _("http://example.com:端口"),
      },
    },
    buttons = {
      {
        {
          text = _("取消"),
          id = "close",
          callback = function()
            UIManager:close(self.settings_dialog)
          end,
        },
        {
          text = _("说明"),
          callback = function()
            UIManager:show(InfoMessage:new({
              text = _("请输入你的 KoInsight 服务器地址"),
            }))
          end,
        },
        {
          text = _("应用"),
          callback = function()
            local myfields = self.settings_dialog:getFields()
            self:setServerURL(myfields[1])
            UIManager:close(self.settings_dialog)
            UIManager:show(InfoMessage:new({ text = _("KoInsight 设置已保存。"), timeout = 2 }))
          end,
        },
      },
    },
  })

  UIManager:show(self.settings_dialog)
  self.settings_dialog:onShowKeyboard()
end

function KoInsightSettings:editTimeoutDialog()
  local current = tostring(self:getSuspendConnectTimeout())
  self.timeout_dialog = MultiInputDialog:new({
    title = _("休眠连接超时（秒）"),
    fields = {
      {
        text = current,
        description = _("超时（3..60）："),
        hint = _("10"),
        input_type = "number",
      },
    },
    buttons = {
      {
        {
          text = _("取消"),
          id = "close",
          callback = function()
            UIManager:close(self.timeout_dialog)
          end,
        },
        {
          text = _("应用"),
          callback = function()
            local fields = self.timeout_dialog:getFields()
            self:setSuspendConnectTimeout(fields[1])
            UIManager:close(self.timeout_dialog)
            UIManager:show(InfoMessage:new({ text = _("超时设置已保存。"), timeout = 2 }))
          end,
        },
      },
    },
  })
  UIManager:show(self.timeout_dialog)
  self.timeout_dialog:onShowKeyboard()
end

return KoInsightSettings
