extends Node

const SEED_MAIN := 424242
const SEED_FUZZ := 123456

const TRIALS_DIST := 10000
const TRIALS_PUNTS := 2000

const SCENARIO_TIMEOUT := 10000 # ms

const ARTIFACT_DIR := "user://qa_artifacts"

static func ensure_artifact_dir() -> void:
	var ok := DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(ARTIFACT_DIR))
	if ok != OK:
		# In case of race or pre-existing
		pass


