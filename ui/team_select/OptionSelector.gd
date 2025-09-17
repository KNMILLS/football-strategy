extends HBoxContainer

signal value_changed(option_name: String, value: String)

@export var option_name: String = ""

@onready var name_label: Label = $NameLabel
@onready var left_btn: Button = $LeftBtn
@onready var value_label: Label = $ValueLabel
@onready var right_btn: Button = $RightBtn

var _values: Array[String] = []
var _index: int = 0
var _enabled: bool = true

func _ready() -> void:
	name_label.text = option_name
	left_btn.pressed.connect(_on_left)
	right_btn.pressed.connect(_on_right)
	_update_state()
	set_process_unhandled_input(true)

func set_option_name(text: String) -> void:
	option_name = String(text)
	name_label.text = option_name

func set_values(values: Array) -> void:
	_values.clear()
	for v in values:
		_values.append(String(v))
	_index = clamp(_index, 0, max(0, _values.size() - 1))
	_update_state()

func set_value(value: String) -> void:
	var idx: int = _values.find(String(value))
	if idx >= 0:
		_index = idx
		_update_state()

func get_value() -> String:
	if _values.size() == 0:
		return ""
	return String(_values[_index])

func set_enabled(enabled: bool) -> void:
	_enabled = bool(enabled)
	left_btn.disabled = not _enabled
	right_btn.disabled = not _enabled
	modulate = Color(1, 1, 1, 1) if _enabled else Color(1, 1, 1, 0.6)

func _on_left() -> void:
	if not _enabled or _values.size() == 0:
		return
	_index = (_index - 1 + _values.size()) % _values.size()
	_update_state()
	_emit_changed()

func _on_right() -> void:
	if not _enabled or _values.size() == 0:
		return
	_index = (_index + 1) % _values.size()
	_update_state()
	_emit_changed()

func _emit_changed() -> void:
	emit_signal("value_changed", option_name, get_value())

func _update_state() -> void:
	value_label.text = ("" if _values.size() == 0 else String(_values[_index]))
	name_label.text = option_name

func _unhandled_input(event: InputEvent) -> void:
	if not _enabled:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var key: int = (event as InputEventKey).physical_keycode
		if key == KEY_LEFT:
			_on_left()
		elif key == KEY_RIGHT:
			_on_right()


