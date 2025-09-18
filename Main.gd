extends Control

var log_lines: Array[String] = []

@onready var score_label: Label = $RootMargin/VMain/HeaderBar/Score
@onready var clock_label: Label = $RootMargin/VMain/HeaderBar/Clock
@onready var quarter_label: Label = $RootMargin/VMain/HeaderBar/Quarter
@onready var ot_timeouts_label: Label = $RootMargin/VMain/HeaderBar/OTTimeouts
@onready var preset_label: Label = $RootMargin/VMain/HeaderBar/PresetLabel
@onready var timeout_button: Button = $RootMargin/VMain/HeaderBar/TimeoutButton
 

@onready var spot_label: Label = $RootMargin/VMain/FieldPanel/FieldHBox/SpotLabel
@onready var down_label: Label = $RootMargin/VMain/FieldPanel/FieldHBox/DownLabel

@onready var btn_inside_power: Button = $RootMargin/VMain/OffensePanel/RunsVBox/BtnInsidePower
@onready var btn_outside_zone: Button = $RootMargin/VMain/OffensePanel/RunsVBox/BtnOutsideZone
@onready var btn_draw: Button = $RootMargin/VMain/OffensePanel/RunsVBox/BtnDraw
@onready var btn_qb_sneak: Button = $RootMargin/VMain/OffensePanel/RunsVBox/BtnQBSneak
@onready var btn_quick_slant: Button = $RootMargin/VMain/OffensePanel/PassVBox/BtnQuickSlant
@onready var btn_screen: Button = $RootMargin/VMain/OffensePanel/PassVBox/BtnScreen
@onready var btn_medium_cross: Button = $RootMargin/VMain/OffensePanel/PassVBox/BtnMediumCross
@onready var btn_deep_post: Button = $RootMargin/VMain/OffensePanel/PassVBox/BtnDeepPost
@onready var btn_pa_short: Button = $RootMargin/VMain/OffensePanel/PassVBox/BtnPAShort
@onready var btn_pa_deep: Button = $RootMargin/VMain/OffensePanel/PassVBox/BtnPADeep
@onready var btn_punt: Button = $RootMargin/VMain/OffensePanel/SpecialVBox/BtnPunt
@onready var btn_fg: Button = $RootMargin/VMain/OffensePanel/SpecialVBox/BtnFG

@onready var banner_panel: Panel = $RootMargin/VMain/BannerPanel
@onready var banner_label: Label = $RootMargin/VMain/BannerPanel/BannerLabel

@onready var log_rtl: RichTextLabel = $RootMargin/VMain/ActionLog

@onready var defense_modal: Window = $DefenseModal
@onready var try_modal: Window = $TryModal
@onready var btn_try_xp: Button = $TryModal/TryVBox/TryButtons/BtnTryXP
@onready var btn_try_two: Button = $TryModal/TryVBox/TryButtons/BtnTryTwo
@onready var free_kick_modal: Window = $FreeKickModal
@onready var btn_kickoff: Button = $FreeKickModal/FKVBox/FKButtons/BtnKickoff
@onready var btn_onside: Button = $FreeKickModal/FKVBox/FKButtons/BtnOnside
@onready var coin_toss_modal: Window = $CoinTossModal
@onready var btn_heads: Button = $CoinTossModal/CTVBox/CTButtons/BtnHeads
@onready var btn_tails: Button = $CoinTossModal/CTVBox/CTButtons/BtnTails
@onready var ct_result_label: Label = $CoinTossModal/CTVBox/CTResult
@onready var btn_receive: Button = $CoinTossModal/CTVBox/CTChoiceButtons/BtnReceive
@onready var btn_defend: Button = $CoinTossModal/CTVBox/CTChoiceButtons/BtnDefend
@onready var btn_run_blitz: Button = $DefenseModal/DMVBox/DMButtons/BtnRunBlitz
@onready var btn_balanced: Button = $DefenseModal/DMVBox/DMButtons/BtnBalanced
@onready var btn_pass_shell: Button = $DefenseModal/DMVBox/DMButtons/BtnPassShell
@onready var btn_all_out: Button = $DefenseModal/DMVBox/DMButtons/BtnAllOut
@onready var btn_zone_blitz: Button = $DefenseModal/DMVBox/DMButtons/BtnZoneBlitz
@onready var btn_prevent: Button = $DefenseModal/DMVBox/DMButtons/BtnPrevent

@onready var hud_panel: Panel = $DeterminismHUD
@onready var hud_label: Label = $DeterminismHUD/HUDLabel

@onready var root_margin: MarginContainer = $RootMargin

func _ready() -> void:
	_connect_signals()
	_setup_shortcuts()
	# Configure 15:00 quarters
	var gc := get_node_or_null("/root/GameConfig")
	if gc != null and gc.has_method("set_quarter_preset"):
		gc.call("set_quarter_preset", "FULL")
	# Start session immediately (Human vs AI) and show coin toss
	var sm: Object = get_node("/root/SeedManager")
	var gs: Object = get_node("/root/GameState")
	gs.new_session(int(sm.get("current_seed")), 1, 0)
	gs.call_deferred("prepare_regulation_coin_toss")
	_update_hud()
	_update_header()

func _connect_signals() -> void:
	timeout_button.pressed.connect(_press_timeout)

	btn_inside_power.pressed.connect(func(): _offense_pick("INSIDE_POWER"))
	btn_outside_zone.pressed.connect(func(): _offense_pick("OUTSIDE_ZONE"))
	btn_draw.pressed.connect(func(): _offense_pick("DRAW"))
	btn_qb_sneak.pressed.connect(func(): _offense_pick("QB_SNEAK"))
	btn_quick_slant.pressed.connect(func(): _offense_pick("QUICK_SLANT"))
	btn_screen.pressed.connect(func(): _offense_pick("SCREEN"))
	btn_medium_cross.pressed.connect(func(): _offense_pick("MEDIUM_CROSS"))
	btn_deep_post.pressed.connect(func(): _offense_pick("DEEP_POST"))
	btn_pa_short.pressed.connect(func(): _offense_pick("PA_SHORT"))
	btn_pa_deep.pressed.connect(func(): _offense_pick("PA_DEEP"))
	btn_punt.pressed.connect(func(): _offense_pick("PUNT"))
	btn_fg.pressed.connect(func(): _offense_pick("FG"))

	btn_run_blitz.pressed.connect(func(): _defense_pick("RUN_BLITZ"))
	btn_balanced.pressed.connect(func(): _defense_pick("BALANCED"))
	btn_pass_shell.pressed.connect(func(): _defense_pick("PASS_SHELL"))
	btn_all_out.pressed.connect(func(): _defense_pick("PRESS_MAN"))
	btn_zone_blitz.pressed.connect(func(): _defense_pick("ZONE_BLITZ"))
	btn_prevent.pressed.connect(func(): _defense_pick("PREVENT"))

	var gs: Object = get_node("/root/GameState")
	gs.ui_update_header.connect(_update_header)
	gs.ui_update_field.connect(_update_field)
	gs.ui_update_log.connect(_append_log)
	gs.ui_state_changed.connect(_on_state_changed)
	btn_try_xp.pressed.connect(func(): _try_pick("XP"))
	btn_try_two.pressed.connect(func(): _try_pick("TWO"))
	btn_kickoff.pressed.connect(func(): _free_kick_pick("KICKOFF"))
	btn_onside.pressed.connect(func(): _free_kick_pick("ONSIDE"))
	gs.ui_banner.connect(_show_banner)
	if gs.has_signal("ui_coin_toss_needed"):
		gs.ui_coin_toss_needed.connect(_on_coin_toss_needed)
	btn_heads.pressed.connect(func(): _coin_toss_pick(true))
	btn_tails.pressed.connect(func(): _coin_toss_pick(false))
	btn_receive.pressed.connect(func(): _coin_choice("RECEIVE"))
	btn_defend.pressed.connect(func(): _coin_choice("DEFEND"))

func _setup_shortcuts() -> void:
	_assign_shortcut(btn_inside_power, KEY_1)
	_assign_shortcut(btn_outside_zone, KEY_2)
	_assign_shortcut(btn_draw, KEY_3)
	_assign_shortcut(btn_qb_sneak, KEY_4)
	_assign_shortcut(btn_quick_slant, KEY_5)
	_assign_shortcut(btn_screen, KEY_6)
	_assign_shortcut(btn_medium_cross, KEY_7)
	_assign_shortcut(btn_deep_post, KEY_8)
	_assign_shortcut(btn_pa_short, KEY_9)
	_assign_shortcut(btn_pa_deep, KEY_0)
	_assign_shortcut(btn_punt, KEY_P)
	_assign_shortcut(btn_fg, KEY_F)
	_assign_shortcut(btn_run_blitz, KEY_Q)
	_assign_shortcut(btn_balanced, KEY_W)
	_assign_shortcut(btn_pass_shell, KEY_E)
	_assign_shortcut(btn_all_out, KEY_R)
	_assign_shortcut(btn_zone_blitz, KEY_T)
	_assign_shortcut(btn_prevent, KEY_Y)
	# Header timeout hotkey (T also used in defense modal; only active when no modal)
	var sc := Shortcut.new()
	var ev := InputEventKey.new()
	ev.physical_keycode = KEY_T
	sc.events = [ev]
	timeout_button.shortcut = sc

 

func _assign_shortcut(button: Button, keycode: Key) -> void:
	var sc := Shortcut.new()
	var ev := InputEventKey.new()
	ev.physical_keycode = keycode
	sc.events = [ev]
	button.shortcut = sc

 

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
	clock_label.text = gs.get_clock_text()
	quarter_label.text = gs.get_quarter_text()
	_update_preset_label()
	_update_timeouts_label()
	_update_hud()

func _update_field() -> void:
	var gs: Object = get_node("/root/GameState")
	spot_label.text = "Ball: %s" % gs.get_spot_text()
	down_label.text = gs.get_down_text()
	clock_label.text = gs.get_clock_text()
	quarter_label.text = gs.get_quarter_text()
	_update_preset_label()
	_update_timeouts_label()
	_update_hud()

func _append_log(new_line: String) -> void:
	log_lines.append(new_line)
	log_rtl.append_text(new_line + "\n")
	log_rtl.scroll_to_line(log_rtl.get_line_count() - 1)

func _on_state_changed(state_name: String) -> void:
	if state_name == "DEFENSE_SELECT":
		defense_modal.popup_centered()
	elif state_name == "TRY_SELECT":
		try_modal.popup_centered()
	elif state_name == "FREE_KICK_SELECT":
		_update_free_kick_modal()
		free_kick_modal.popup_centered()

func _show_banner(text: String) -> void:
	banner_label.text = text
	var tw := create_tween()
	banner_panel.modulate.a = 0.0
	tw.tween_property(banner_panel, "modulate:a", 1.0, 0.25).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.tween_interval(1.0)
	tw.tween_property(banner_panel, "modulate:a", 0.0, 0.35)

 

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_F1:
			hud_panel.visible = !hud_panel.visible
			_update_hud()
		elif event.physical_keycode == KEY_X:
			if try_modal.visible:
				_try_pick("XP")
		elif event.physical_keycode == KEY_2:
			if try_modal.visible:
				_try_pick("TWO")
		elif event.physical_keycode == KEY_K:
			if free_kick_modal.visible:
				_free_kick_pick("KICKOFF")
		elif event.physical_keycode == KEY_O:
			if free_kick_modal.visible and not btn_onside.disabled:
				_free_kick_pick("ONSIDE")
		elif event.physical_keycode == KEY_T:
			_press_timeout()

func _try_pick(kind: String) -> void:
	try_modal.hide()
	var gs: Object = get_node("/root/GameState")
	gs.call("try_select", String(kind))

func _update_free_kick_modal() -> void:
	var gs: Object = get_node("/root/GameState")
	var allowed := bool(gs.call("is_onside_allowed"))
	btn_onside.disabled = not allowed
	btn_onside.hint_tooltip = "Available when trailing" if not allowed else ""

func _free_kick_pick(kind: String) -> void:
	free_kick_modal.hide()
	var gs: Object = get_node("/root/GameState")
	gs.call("free_kick_select", String(kind))

func _update_hud() -> void:
	var sm: Object = get_node("/root/SeedManager")
	hud_label.text = "Seed: %s RNG#: %s" % [str(sm.current_seed), str(sm.rng_call_count)]

func _on_coin_toss_needed() -> void:
	ct_result_label.text = "Regulation Coin Toss — Visitor calls: Heads or Tails"
	btn_heads.disabled = false
	btn_tails.disabled = false
	btn_receive.disabled = true
	btn_defend.disabled = true
	coin_toss_modal.popup_centered()

func _coin_toss_pick(visitor_called_heads: bool) -> void:
	var gs: Object = get_node("/root/GameState")
	btn_heads.disabled = true
	btn_tails.disabled = true
	var winner: int = int(gs.call("perform_coin_toss", bool(visitor_called_heads)))
	var who := ("Away" if winner == 1 else "Home")
	ct_result_label.text = "%s wins toss – choose Receive or Defend" % who
	btn_receive.disabled = false
	btn_defend.disabled = false

func _coin_choice(choice: String) -> void:
	var gs: Object = get_node("/root/GameState")
	# Prevent double-clicking
	btn_receive.disabled = true
	btn_defend.disabled = true
	# If we're in OT entry, route to OT; else regulation kickoff
	if bool(gs.get("is_overtime")):
		gs.call("enter_overtime_with_choice", String(choice))
	else:
		gs.call("enter_regulation_with_choice", String(choice))
	coin_toss_modal.hide()
	_update_timeouts_label()

func _update_timeouts_label() -> void:
	var gs: Object = get_node("/root/GameState")
	if bool(gs.get("is_overtime")):
		var h := int(gs.call("ot_timeouts_remaining", 0))
		var a := int(gs.call("ot_timeouts_remaining", 1))
		ot_timeouts_label.text = "OT TO: H %d | A %d" % [h, a]
	else:
		var h2 := int(gs.call("reg_timeouts_remaining", 0))
		var a2 := int(gs.call("reg_timeouts_remaining", 1))
		ot_timeouts_label.text = "TO: H %d | A %d" % [h2, a2]

func _update_preset_label() -> void:
	var gc := get_node_or_null("/root/GameConfig")
	var preset := "STANDARD"
	if gc != null and gc.has_method("get_quarter_preset"):
		preset = String(gc.call("get_quarter_preset")).to_upper()
	var t: Object = load("res://scripts/Timing.gd").new()
	t.load_cfg()
	var secs := int(t.call("get_preset_seconds", preset))
	var mm := int(secs / 60.0)
	var ss := int(secs % 60)
	var preset_len := "%d:%02d" % [mm, ss]
	preset_label.text = "%s %s" % [preset, preset_len]


func set_debug_hud_visible(visible_flag: bool) -> void:
	hud_panel.visible = visible_flag
	_update_hud()

 

func _press_timeout() -> void:
	# Only allow when no selection modals are open
	if defense_modal.visible or try_modal.visible or free_kick_modal.visible or coin_toss_modal.visible:
		return
	var gs: Object = get_node("/root/GameState")
	# Only regulation pre-snap; spend for current offense team
	if not bool(gs.get("is_overtime")):
		var offense_idx := int(0 if bool(gs.get("offense_is_home")) else 1)
		var ok := bool(gs.call("spend_reg_timeout", offense_idx))
		if ok:
			_update_timeouts_label()
