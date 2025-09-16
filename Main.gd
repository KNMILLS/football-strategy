extends Control

var log_lines: Array[String] = []

@onready var score_label: Label = $RootMargin/VMain/HeaderBar/Score
@onready var drive_label: Label = $RootMargin/VMain/HeaderBar/Drive
@onready var seed_input: LineEdit = $RootMargin/VMain/HeaderBar/SeedInput
@onready var drives_spin: SpinBox = $RootMargin/VMain/HeaderBar/DrivesSpin
@onready var mode_option: OptionButton = $RootMargin/VMain/HeaderBar/ModeOption
@onready var start_button: Button = $RootMargin/VMain/HeaderBar/StartButton
@onready var reset_seed_button: Button = $RootMargin/VMain/HeaderBar/ResetSeedButton
@onready var help_button: Button = $RootMargin/VMain/HeaderBar/HelpButton
@onready var quick_play_button: Button = $RootMargin/VMain/HeaderBar/QuickPlayButton
@onready var auto_offense_check: CheckButton = $RootMargin/VMain/HeaderBar/AutoOffense

@onready var spot_label: Label = $RootMargin/VMain/FieldPanel/FieldHBox/SpotLabel
@onready var down_label: Label = $RootMargin/VMain/FieldPanel/FieldHBox/DownLabel

@onready var btn_run_in: Button = $RootMargin/VMain/OffensePanel/BtnRunIn
@onready var btn_run_out: Button = $RootMargin/VMain/OffensePanel/BtnRunOut
@onready var btn_pass_short: Button = $RootMargin/VMain/OffensePanel/BtnPassShort
@onready var btn_pass_long: Button = $RootMargin/VMain/OffensePanel/BtnPassLong
@onready var btn_punt: Button = $RootMargin/VMain/OffensePanel/BtnPunt
@onready var btn_fg: Button = $RootMargin/VMain/OffensePanel/BtnFG

@onready var banner_panel: Panel = $RootMargin/VMain/BannerPanel
@onready var banner_label: Label = $RootMargin/VMain/BannerPanel/BannerLabel

@onready var log_rtl: RichTextLabel = $RootMargin/VMain/ActionLog

@onready var defense_modal: Window = $DefenseModal
@onready var btn_run_blitz: Button = $DefenseModal/DMVBox/DMButtons/BtnRunBlitz
@onready var btn_balanced: Button = $DefenseModal/DMVBox/DMButtons/BtnBalanced
@onready var btn_pass_shell: Button = $DefenseModal/DMVBox/DMButtons/BtnPassShell
@onready var btn_all_out: Button = $DefenseModal/DMVBox/DMButtons/BtnAllOut

@onready var help_overlay: Panel = $HelpOverlay
@onready var hud_panel: Panel = $DeterminismHUD
@onready var hud_label: Label = $DeterminismHUD/HUDLabel

@onready var splash_overlay: Panel = $SplashOverlay
@onready var setup_overlay: Panel = $SetupOverlay
@onready var setup_team1: OptionButton = $SetupOverlay/SetupVBox/TileGrid/Team1Panel/Team1VBox/Team1Option
@onready var setup_team2: OptionButton = $SetupOverlay/SetupVBox/TileGrid/Team2Panel/Team2VBox/Team2Option
@onready var setup_difficulty: OptionButton = $SetupOverlay/SetupVBox/TileGrid/DifficultyPanel/DifficultyVBox/DifficultyOption
@onready var setup_start_button: Button = $SetupOverlay/SetupVBox/StartSetupButton

func _ready() -> void:
	_connect_signals()
	_setup_shortcuts()
	_update_header()
	_update_field()
	var sm: Object = get_node("/root/SeedManager")
	seed_input.text = str(sm.current_seed)
	_show_splash_then_setup()

func _connect_signals() -> void:
	start_button.pressed.connect(_on_start_pressed)
	reset_seed_button.pressed.connect(_on_reset_seed)
	help_button.pressed.connect(_toggle_help)
	quick_play_button.pressed.connect(_quick_play)

	btn_run_in.pressed.connect(func(): _offense_pick("RUN_IN"))
	btn_run_out.pressed.connect(func(): _offense_pick("RUN_OUT"))
	btn_pass_short.pressed.connect(func(): _offense_pick("PASS_SHORT"))
	btn_pass_long.pressed.connect(func(): _offense_pick("PASS_LONG"))
	btn_punt.pressed.connect(func(): _offense_pick("PUNT"))
	btn_fg.pressed.connect(func(): _offense_pick("FG"))

	btn_run_blitz.pressed.connect(func(): _defense_pick("RUN_BLITZ"))
	btn_balanced.pressed.connect(func(): _defense_pick("BALANCED"))
	btn_pass_shell.pressed.connect(func(): _defense_pick("PASS_SHELL"))
	btn_all_out.pressed.connect(func(): _defense_pick("ALL_OUT_RUSH"))

	var gs: Object = get_node("/root/GameState")
	gs.ui_update_header.connect(_update_header)
	gs.ui_update_field.connect(_update_field)
	gs.ui_update_log.connect(_append_log)
	gs.ui_state_changed.connect(_on_state_changed)
	gs.ui_banner.connect(_show_banner)
	setup_start_button.pressed.connect(_on_setup_start)

func _setup_shortcuts() -> void:
	_assign_shortcut(btn_run_in, KEY_1)
	_assign_shortcut(btn_run_out, KEY_2)
	_assign_shortcut(btn_pass_short, KEY_3)
	_assign_shortcut(btn_pass_long, KEY_4)
	_assign_shortcut(btn_punt, KEY_5)
	_assign_shortcut(btn_fg, KEY_6)
	_assign_shortcut(btn_run_blitz, KEY_Q)
	_assign_shortcut(btn_balanced, KEY_W)
	_assign_shortcut(btn_pass_shell, KEY_E)
	_assign_shortcut(btn_all_out, KEY_R)

func _show_splash_then_setup() -> void:
	# Show splash for ~1.2s then show setup
	splash_overlay.visible = true
	setup_overlay.visible = false
	var tw := create_tween()
	splash_overlay.modulate.a = 1.0
	tw.tween_interval(1.2)
	tw.tween_callback(Callable(self, "_enter_setup"))

func _enter_setup() -> void:
	splash_overlay.visible = false
	setup_overlay.visible = true
	_populate_setup()

func _populate_setup() -> void:
	setup_team1.clear()
	setup_team2.clear()
	var tl: Object = get_node("/root/TeamLoader")
	var pairs: Array = tl.call("get_all_display_pairs")
	var idx := 0
	for p in pairs:
		setup_team1.add_item(String(p[1]), idx)
		setup_team1.set_item_metadata(idx, String(p[0]))
		setup_team2.add_item(String(p[1]), idx)
		setup_team2.set_item_metadata(idx, String(p[0]))
		idx += 1
	setup_team1.select(0)
	setup_team2.select(min(1, max(0, pairs.size() - 1)))
	setup_difficulty.select(1)

func _on_setup_start() -> void:
	# Apply selected teams and difficulty, then hide setup and start session
	var gs: Object = get_node("/root/GameState")
	var home_tid := String(setup_team1.get_item_metadata(setup_team1.get_selected_id()))
	var away_tid := String(setup_team2.get_item_metadata(setup_team2.get_selected_id()))
	var diff_id := int(setup_difficulty.get_selected_id())
	gs.call("set_session_config", home_tid, away_tid, diff_id)
	setup_overlay.visible = false
	# Start session immediately with current header controls
	var seed_text := seed_input.text.strip_edges()
	var sm: Object = get_node("/root/SeedManager")
	var seed_val: int = sm.current_seed
	if seed_text != "":
		seed_val = int(seed_text.to_int())
	var drives: int = int(drives_spin.value)
	var mode: int = 1 if mode_option.get_selected_id() == 1 else 0
	gs.new_session(seed_val, drives, int(mode))
	_update_hud()

func _assign_shortcut(button: Button, keycode: Key) -> void:
	var sc := Shortcut.new()
	var ev := InputEventKey.new()
	ev.physical_keycode = keycode
	sc.events = [ev]
	button.shortcut = sc

func _on_start_pressed() -> void:
	var seed_text := seed_input.text.strip_edges()
	var sm: Object = get_node("/root/SeedManager")
	var seed_val: int = sm.current_seed
	if seed_text != "":
		seed_val = int(seed_text.to_int())
	var drives: int = int(drives_spin.value)
	var mode: int = 1 if mode_option.get_selected_id() == 1 else 0
	var gs: Object = get_node("/root/GameState")
	gs.new_session(seed_val, drives, int(mode))
	_update_hud()

func _quick_play() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.reseed_with_time()
	seed_input.text = str(sm.current_seed)
	mode_option.select(0)
	drives_spin.value = 4
	var gs: Object = get_node("/root/GameState")
	gs.new_session(int(sm.current_seed), 4, 0)
	_update_hud()

func _on_reset_seed() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.reseed_with_time()
	seed_input.text = str(sm.current_seed)
	_update_hud()

func _offense_pick(play_key: String) -> void:
	var gs: Object = get_node("/root/GameState")
	gs.offense_select(play_key)

func _defense_pick(play_key: String) -> void:
	defense_modal.hide()
	var gs: Object = get_node("/root/GameState")
	gs.defense_select(play_key)

func _update_header() -> void:
	var gs: Object = get_node("/root/GameState")
	score_label.text = gs.get_score_text()
	drive_label.text = gs.get_drive_text()
	_update_hud()

func _update_field() -> void:
	var gs: Object = get_node("/root/GameState")
	spot_label.text = "Ball: %s" % gs.get_spot_text()
	down_label.text = gs.get_down_text()
	_update_hud()

func _append_log(new_line: String) -> void:
	log_lines.append(new_line)
	while log_lines.size() > 20:
		log_lines.pop_front()
	log_rtl.text = ""
	for ln in log_lines:
		log_rtl.append_text(ln + "\n")

func _on_state_changed(state_name: String) -> void:
	if state_name == "DEFENSE_SELECT":
		defense_modal.popup_centered()

func _show_banner(text: String) -> void:
	banner_label.text = text
	var tw := create_tween()
	banner_panel.modulate.a = 0.0
	tw.tween_property(banner_panel, "modulate:a", 1.0, 0.25).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.tween_interval(1.0)
	tw.tween_property(banner_panel, "modulate:a", 0.0, 0.35)

func _toggle_help() -> void:
	help_overlay.visible = !help_overlay.visible

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_H:
			_toggle_help()
		elif event.physical_keycode == KEY_ENTER:
			# Only allow Quick Play when header controls have focus and no modal is open
			if not defense_modal.visible and (
				start_button.has_focus() or quick_play_button.has_focus() or seed_input.has_focus() or drives_spin.has_focus() or mode_option.has_focus() or reset_seed_button.has_focus() or help_button.has_focus() or auto_offense_check.has_focus()
			):
				_quick_play()
		elif event.physical_keycode == KEY_F1:
			hud_panel.visible = !hud_panel.visible
			_update_hud()

func _update_hud() -> void:
	var sm: Object = get_node("/root/SeedManager")
	hud_label.text = "Seed: %s RNG#: %s" % [str(sm.current_seed), str(sm.rng_call_count)]


func set_debug_hud_visible(visible_flag: bool) -> void:
	hud_panel.visible = visible_flag
	_update_hud()
