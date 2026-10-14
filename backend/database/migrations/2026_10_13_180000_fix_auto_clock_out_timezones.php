<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Adjust existing auto-clock-out records that were saved with local time (17:30:00)
        // so that they are stored in UTC (12:00:00), rendering correctly as 17:30 / 5:30 PM in client browsers.
        DB::statement("
            UPDATE hr_attendances 
            SET clock_out_time = DATE_SUB(clock_out_time, INTERVAL '5:30' HOUR_MINUTE)
            WHERE is_auto_clock_out = 1 
              AND TIME(clock_out_time) = '17:30:00'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("
            UPDATE hr_attendances 
            SET clock_out_time = DATE_ADD(clock_out_time, INTERVAL '5:30' HOUR_MINUTE)
            WHERE is_auto_clock_out = 1 
              AND TIME(clock_out_time) = '12:00:00'
        ");
    }
};
