<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix any attendance records in the database erroneously marked as 'late'
     * despite clocking in strictly before 09:11:00 AM Colombo time (within grace period).
     */
    public function up(): void
    {
        $lateRecords = DB::table('hr_attendances')
            ->where('status', 'late')
            ->whereNotNull('clock_in_time')
            ->where('is_manual_override', false)
            ->get();

        $idsToUpdate = [];

        foreach ($lateRecords as $record) {
            $colomboTime = Carbon::parse($record->clock_in_time)->timezone('Asia/Colombo');
            $lateThreshold = Carbon::parse($colomboTime->toDateString() . ' 09:11:00', 'Asia/Colombo');
            if ($colomboTime->lt($lateThreshold)) {
                $idsToUpdate[] = $record->id;
            }
        }

        if (!empty($idsToUpdate)) {
            DB::table('hr_attendances')
                ->whereIn('id', $idsToUpdate)
                ->update(['status' => 'present']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Irreversible data correction
    }
};
