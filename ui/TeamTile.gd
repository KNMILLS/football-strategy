extends Button

signal tile_hovered(team_id: String)
signal tile_pressed(team_id: String)

var team_id: String = ""
var team_display_name: String = ""

@onready var name_label: Label = $Label
@onready var badge_label: Label = $Badge

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

func _on_mouse_entered() -> void:
    if team_id != "":
        emit_signal("tile_hovered", team_id)

func _on_focus_entered() -> void:
    if team_id != "":
        emit_signal("tile_hovered", team_id)

func _on_pressed() -> void:
    if team_id != "":
        emit_signal("tile_pressed", team_id)


