<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add 'subtasks' JSON column to 'hr_appraisal_objectives' table
     * to support multiple subtasks, targets, and deadlines per objective goal.
     */
    public function up(): void
    {
        if (Schema::hasTable('hr_appraisal_objectives')) {
            Schema::table('hr_appraisal_objectives', function (Blueprint $table) {
                if (!Schema::hasColumn('hr_appraisal_objectives', 'subtasks')) {
                    $table->json('subtasks')->nullable()->after('description');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('hr_appraisal_objectives')) {
            Schema::table('hr_appraisal_objectives', function (Blueprint $table) {
                if (Schema::hasColumn('hr_appraisal_objectives', 'subtasks')) {
                    $table->dropColumn('subtasks');
                }
            });
        }
    }
};

