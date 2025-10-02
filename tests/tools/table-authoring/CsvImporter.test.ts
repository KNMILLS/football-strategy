import { describe, it, expect } from 'vitest';
import { parseCsvContent, validateCsvFormat } from '../../../src/tools/table-authoring/CsvImporter.js';

describe('CsvImporter', () => {
  describe('validateCsvFormat', () => {
    it('should validate properly formatted CSV', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock
west_coast_blitz,West Coast,Blitz,3,0,20
west_coast_blitz,West Coast,Blitz,4,2,20`;

      const result = validateCsvFormat(csvContent);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty CSV', () => {
      const result = validateCsvFormat('');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('should detect missing headers', () => {
      const csvContent = `3,0,20
4,2,20`;

      const result = validateCsvFormat(csvContent);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('recognizable'))).toBe(true);
    });

    it('should provide warnings for format issues', () => {
      const csvContent = `table_name,off_card,def_card
west_coast_blitz,West Coast,Blitz`;

      const result = validateCsvFormat(csvContent);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('parseCsvContent', () => {
    it('should parse complete table definition', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock,meta_risk_profile
west_coast_blitz,West Coast,Blitz,3,0,20,medium
west_coast_blitz,West Coast,Blitz,4,2,20,medium`;

      const result = parseCsvContent(csvContent);

      expect(Object.keys(result.tables)).toHaveLength(1);
      expect(result.tables['west_coast_blitz']).toBeDefined();

      const table = result.tables['west_coast_blitz'];
      expect(table.off_card).toBe('West Coast');
      expect(table.def_card).toBe('Blitz');
      expect(table.entries['3'].yards).toBe(0);
      expect(table.entries['4'].yards).toBe(2);
      expect(table.meta.risk_profile).toBe('medium');
    });

    it('should handle multiple tables in one CSV', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock
table1,Offense1,Defense1,3,0,20
table1,Offense1,Defense1,4,2,20
table2,Offense2,Defense2,3,1,10
table2,Offense2,Defense2,4,3,10`;

      const result = parseCsvContent(csvContent);

      expect(Object.keys(result.tables)).toHaveLength(2);
      expect(result.tables['table1']).toBeDefined();
      expect(result.tables['table2']).toBeDefined();

      expect(result.tables['table1'].entries['3'].yards).toBe(0);
      expect(result.tables['table2'].entries['3'].yards).toBe(1);
    });

    it('should handle table metadata rows', () => {
      const csvContent = `table_name,off_card,def_card,doubles_1,doubles_20,doubles_2_19_penalty_ref,meta_oob_bias,meta_field_pos_clamp,meta_risk_profile,meta_explosive_start_sum
test_table,Test Offense,Test Defense,DEF_TD,OFF_TD,default_penalty,true,false,high,25`;

      const result = parseCsvContent(csvContent);

      expect(Object.keys(result.tables)).toHaveLength(1);
      const table = result.tables['test_table'];

      expect(table.doubles['1'].result).toBe('DEF_TD');
      expect(table.doubles['20'].result).toBe('OFF_TD');
      expect(table.doubles['2-19'].penalty_table_ref).toBe('default_penalty');
      expect(table.meta.oob_bias).toBe(true);
      expect(table.meta.field_pos_clamp).toBe(false);
      expect(table.meta.risk_profile).toBe('high');
      expect(table.meta.explosive_start_sum).toBe(25);
    });

    it('should handle entry rows with turnovers', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock,turnover_type,turnover_return_yards,turnover_return_to
test_table,Test Offense,Test Defense,3,0,20,FUM,5,LOS
test_table,Test Offense,Test Defense,4,0,20,INT,10,LOS`;

      const result = parseCsvContent(csvContent);

      expect(result.tables['test_table'].entries['3'].turnover).toBeDefined();
      expect(result.tables['test_table'].entries['3'].turnover?.type).toBe('FUM');
      expect(result.tables['test_table'].entries['3'].turnover?.return_yards).toBe(5);
      expect(result.tables['test_table'].entries['4'].turnover?.type).toBe('INT');
      expect(result.tables['test_table'].entries['4'].turnover?.return_yards).toBe(10);
    });

    it('should validate dice sum ranges', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock
test_table,Test Offense,Test Defense,2,0,20
test_table,Test Offense,Test Defense,40,5,20`;

      const result = parseCsvContent(csvContent);

      expect(result.errors.some(e => e.includes('Invalid dice_sum'))).toBe(true);
      expect(Object.keys(result.tables)).toHaveLength(0);
    });

    it('should handle malformed CSV gracefully', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock
test_table,Test Offense,Test Defense,3,0,20
invalid_row_with_too_many_fields,field1,field2,field3,field4,field5,field6,field7`;

      const result = parseCsvContent(csvContent);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.metadata.totalRows).toBeGreaterThan(0);
      expect(result.metadata.skippedRows).toBeGreaterThan(0);
    });

    it('should handle quoted fields correctly', () => {
      const csvContent = `"table_name","off_card","def_card","dice_sum","yards","clock"
"test_table","Test ""Quoted"" Offense","Test Defense","3","0","20"`;

      const result = parseCsvContent(csvContent);

      expect(Object.keys(result.tables)).toHaveLength(1);
      expect(result.tables['test_table'].off_card).toBe('Test "Quoted" Offense');
    });

    it('should report duplicate table names', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock
test_table,Offense1,Defense1,3,0,20
test_table,Offense2,Defense2,4,2,20`;

      const result = parseCsvContent(csvContent);

      expect(result.errors.some(e => e.includes('Duplicate table name'))).toBe(true);
    });

    it('should handle missing optional fields gracefully', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock
test_table,Test Offense,Test Defense,3,0,20
test_table,Test Offense,Test Defense,4,,30`;

      const result = parseCsvContent(csvContent);

      expect(Object.keys(result.tables)).toHaveLength(1);
      expect(result.tables['test_table'].entries['3'].yards).toBe(0);
      expect(result.tables['test_table'].entries['4'].yards).toBe(0); // Should default to 0
      expect(result.tables['test_table'].entries['4'].clock).toBe('30');
    });

    it('should provide detailed error reporting', () => {
      const csvContent = `table_name,off_card,def_card,dice_sum,yards,clock
test_table,Test Offense,Test Defense,invalid_sum,0,20
test_table,Test Offense,Test Defense,3,invalid_yards,20`;

      const result = parseCsvContent(csvContent);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.metadata.totalRows).toBe(2);
      expect(result.metadata.skippedRows).toBe(2);
    });
  });
});
