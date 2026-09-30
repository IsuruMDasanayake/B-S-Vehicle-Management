<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Add epf_no column
        Schema::table('hr_employees', function (Blueprint $table) {
            $table->string('epf_no')->nullable()->after('employee_id');
        });

        // Step 2: Change employment_type from enum to string to support new values
        // First convert enum to string
        DB::statement("ALTER TABLE hr_employees MODIFY employment_type VARCHAR(50) NOT NULL DEFAULT 'permanent'");

        // Step 3: Migrate existing values
        DB::statement("UPDATE hr_employees SET employment_type = 'permanent' WHERE employment_type = 'full_time'");
        DB::statement("UPDATE hr_employees SET employment_type = 'fixed_term_contract' WHERE employment_type = 'contract'");
    }

    public function down(): void
    {
        Schema::table('hr_employees', function (Blueprint $table) {
            $table->dropColumn('epf_no');
        });

        DB::statement("UPDATE hr_employees SET employment_type = 'full_time' WHERE employment_type = 'permanent'");
        DB::statement("UPDATE hr_employees SET employment_type = 'contract' WHERE employment_type = 'fixed_term_contract'");
        DB::statement("ALTER TABLE hr_employees MODIFY employment_type ENUM('full_time','part_time','contract','intern') NOT NULL DEFAULT 'full_time'");
    }
};
