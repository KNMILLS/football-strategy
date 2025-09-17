extends Button

signal tile_hovered(team_id: String)
signal tile_pressed(team_id: String)

var team_id: String = ""
var team_display_name: String = ""
var team_index: int = -1

@onready var name_label: Label = $Label
@onready var badge_label: Label = $Badge
@onready var frame_away: Panel = $FrameAway
@onready var frame_home: Panel = $FrameHome
@onready var lock_badge_away: Label = $LockBadgeAway
@onready var lock_badge_home: Label = $LockBadgeHome
@onready var logo_rect: TextureRect = $Logo
@onready var fallback_rect: ColorRect = $Fallback
@onready var abbrev_label: Label = $Fallback/Abbrev

func _ready() -> void:
	focus_mode = Control.FOCUS_ALL
	mouse_entered.connect(_on_mouse_entered)
	focus_entered.connect(_on_focus_entered)
	pressed.connect(_on_pressed)
	_refresh_text()
	set_badge("")

func set_team(id: String, team_name: String) -> void:
	team_id = String(id)
	team_display_name = String(team_name)
	_refresh_text()
	_refresh_logo()

func set_team_index(idx: int) -> void:
	team_index = int(idx)
	_refresh_logo()

func _refresh_text() -> void:
	if is_instance_valid(name_label):
		name_label.text = team_display_name if team_display_name != "" else team_id

func set_badge(badge_text: String) -> void:
	if badge_text.strip_edges() == "":
		badge_label.visible = false
		badge_label.text = ""
	else:
		badge_label.visible = true
		badge_label.text = badge_text

func set_focus_for(side: String, focused: bool) -> void:
	var s: String = side.to_lower()
	if s == "away":
		frame_away.visible = focused
		frame_away.modulate = Color8(60, 255, 115) # neon green tint
	elif s == "home":
		frame_home.visible = focused
		frame_home.modulate = Color8(255, 211, 77) # gold tint

func set_locked_for(side: String, locked: bool) -> void:
	var s: String = side.to_lower()
	if s == "away":
		lock_badge_away.visible = locked
	elif s == "home":
		lock_badge_home.visible = locked

func _refresh_logo() -> void:
	# Access TeamLoader via autoload; when in editor preview the node may not
	# be in the active tree yet, so use get_node_or_null and tolerate null.
	var tl: Object = get_node_or_null("/root/TeamLoader")
	var d: Dictionary = {}
	if tl != null:
		d = tl.call("get_team_dict", String(team_id))
	else:
		d = {}
	var logo_path: String = String(d.get("logo_path", ""))
	var abbrev: String = String(d.get("abbrev", (tl.call("get_abbrev", String(d.get("display_name", team_display_name))) if tl != null else team_display_name.substr(0, 2).to_upper())))
	var slug: String = String(d.get("display_name", team_display_name)).to_lower().strip_edges()
	slug = slug.replace("/", "_").replace(" ", "_").replace("-", "_")
	var idx1: int = -1
	if team_index >= 0:
		idx1 = team_index + 1
	var candidates: Array = []
	if logo_path != "":
		candidates.append(logo_path)
	candidates.append("res://assets/teams/%s.png" % team_id)
	candidates.append("res://assets/teams/%s.webp" % team_id)
	candidates.append("res://assets/teams/%s.png" % abbrev.to_lower())
	candidates.append("res://assets/teams/%s.png" % slug)
	if idx1 > 0:
		candidates.append("res://assets/teams/%d.png" % idx1)
		candidates.append("res://assets/teams/%d_mf.png" % idx1)
	for p in candidates:
		var ps: String = String(p)
		if ps == "":
			continue
		if ResourceLoader.exists(ps):
			var tex := load(ps)
			if tex is Texture2D:
				logo_rect.texture = tex
				logo_rect.visible = true
				fallback_rect.visible = false
				return
	# Fallback rendered tile with abbrev
	var colors: Dictionary = d.get("colors", {})
	var primary: Color = Color.from_string(String(colors.get("primary", "#2a2d34")), Color(0.16,0.18,0.2))
	var accent: Color = Color.from_string(String(colors.get("accent", "#ffd34d")), Color(1,0.83,0.3))
	var abbr: String = String(d.get("abbrev", (tl.call("get_abbrev", String(d.get("display_name", team_display_name))) if tl != null else team_display_name.substr(0, 2).to_upper())))
	logo_rect.texture = null
	logo_rect.visible = false
	fallback_rect.visible = true
	fallback_rect.color = primary
	abbrev_label.modulate = accent
	abbrev_label.text = abbr

func _on_mouse_entered() -> void:
	if team_id != "":
		emit_signal("tile_hovered", team_id)

func _on_focus_entered() -> void:
	if team_id != "":
		emit_signal("tile_hovered", team_id)

func _on_pressed() -> void:
	if team_id != "":
		emit_signal("tile_pressed", team_id)
