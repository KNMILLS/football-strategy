extends PanelContainer

@onready var logo: TextureRect = $VBox/Logo
@onready var name_label: Label = $VBox/Name
@onready var tags_label: Label = $VBox/Tags
@onready var info_label: RichTextLabel = $VBox/Info

var _team: Dictionary = {}

func clear_panel() -> void:
	_team.clear()
	logo.texture = null
	logo.visible = false
	name_label.text = ""
	tags_label.text = ""
	info_label.clear()

func set_team(team: Dictionary) -> void:
	_team = team.duplicate(true)
	var disp: String = String(_team.get("city", ""))
	var team_name: String = String(_team.get("name", ""))
	var abbr: String = String(_team.get("abbr", ""))
	var offense: String = String(_team.get("offense", ""))
	var defense: String = String(_team.get("defense", ""))
	name_label.text = (disp + (" " if disp != "" else "") + team_name).strip_edges()
	tags_label.text = (abbr + (" — " if abbr != "" else "") + offense + (" / " if offense != "" and defense != "" else "") + defense).strip_edges()
	var strengths: Variant = _team.get("strengths", [])
	var weaknesses: Variant = _team.get("weaknesses", [])
	var strengths_str := String(", ".join(strengths)) if typeof(strengths) == TYPE_ARRAY else String(strengths)
	var weaknesses_str := String(", ".join(weaknesses)) if typeof(weaknesses) == TYPE_ARRAY else String(weaknesses)
	info_label.text = "[b]Strengths[/b]: %s\n[b]Weaknesses[/b]: %s" % [strengths_str, weaknesses_str]
	# Logo
	var logo_path: String = String(_team.get("logo_path", ""))
	if logo_path != "" and ResourceLoader.exists(logo_path):
		var tex := load(logo_path)
		if tex is Texture2D:
			logo.texture = tex
			logo.visible = true
		else:
			logo.texture = null
			logo.visible = false
	else:
		logo.texture = null
		logo.visible = false
