extends Node

# Lightweight guard to enforce schema_version on JSON dictionaries.

class_name SchemaGuard

static func require(dict: Dictionary, expected_version: String, label: String = "") -> void:
	var has_ver := dict.has("schema_version")
	if not has_ver:
		push_error("SchemaGuard: missing schema_version for %s" % label)
		assert(false, "Missing schema_version in %s" % label)
		return
	var found := String(dict.get("schema_version", ""))
	if found != String(expected_version):
		push_error("SchemaGuard: schema mismatch for %s (found %s, expected %s)" % [label, found, expected_version])
		assert(false, "Schema version mismatch for %s" % label)
		return
	# OK
	return


