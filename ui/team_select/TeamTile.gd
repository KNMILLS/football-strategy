extends Button

signal tile_clicked(team_id: String)

@export var team_id: String = ""
@export var abbr: String = ""
@export var logo_path: String = ""

@onready var logo: TextureRect = $VBox/Logo
@onready var label: Label = $VBox/Abbr

var _selected: bool = false

func _ready() -> void:
	_update_visuals()
	pressed.connect(_on_pressed)
	mouse_entered.connect(_on_hover)
	focus_entered.connect(_on_hover)

func set_team(data: Dictionary) -> void:
	team_id = String(data.get("id", team_id))
	abbr = String(data.get("abbr", abbr))
	logo_path = String(data.get("logo_path", logo_path))
	_update_visuals()

func set_selected(is_selected: bool) -> void:
	_selected = bool(is_selected)
	self.add_theme_color_override("font_color", Color(1,1,0) if _selected else Color(1,1,1))
	self.add_theme_color_override("font_pressed_color", Color(1,1,0) if _selected else Color(1,1,1))

func _update_visuals() -> void:
	label.text = (abbr if abbr != "" else team_id)
	if logo_path != "" and ResourceLoader.exists(logo_path):
		var tex := load(logo_path)
		if tex is Texture2D:
			logo.texture = tex
			logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			logo.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
			return
	logo.texture = null

func _on_pressed() -> void:
	if team_id != "":
		emit_signal("tile_clicked", team_id)

func _on_hover() -> void:
	# Just visual hover state; selection handled by parent controller
	pass


