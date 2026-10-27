<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Simplified MBO "Single Appraisal Sheet".
 *
 * Workflow is now:  open -> submitted -> finalized
 *  - Appraiser (Hasintha) sets Objective / Weight / Deadline, Actual Marks, Appraiser Comments
 *  - Employee fills Achievement & Status
 *  - HR fills Attendance & Misconduct deductions
 *
 * Old (6-stage) appraisal records were test data and are discarded.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Discard old test data ──────────────────────────────────────────────
        Schema::disableForeignKeyConstraints();
        DB::table('hr_appraisal_objectives')->truncate();
        DB::table('hr_appraisals')->truncate();
        Schema::enableForeignKeyConstraints();

        // ── Sheet-level additions ──────────────────────────────────────────────
        Schema::table('hr_appraisals', function (Blueprint $table) {
            $table->timestamp('submitted_at')->nullable()->after('employee_comments');
            $table->foreignId('finalized_by')->nullable()->after('director_approved_at')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('finalized_at')->nullable()->after('finalized_by');
        });

        // ── Objective-level additions ──────────────────────────────────────────
        Schema::table('hr_appraisal_objectives', function (Blueprint $table) {
            // Marks given directly out of the objective weight (e.g. 30 out of 40)
            $table->decimal('actual_marks', 5, 2)->nullable()->after('evidence_notes');
        });

        // ── Objective change history (procedure for mid-month changes) ─────────
        Schema::create('hr_appraisal_objective_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appraisal_id')->constrained('hr_appraisals')->cascadeOnDelete();
            $table->unsignedBigInteger('objective_id')->nullable(); // may point to a removed objective
            $table->string('action', 20); // added, updated, removed
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('reason')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_appraisal_objective_revisions');

        Schema::table('hr_appraisal_objectives', function (Blueprint $table) {
            $table->dropColumn('actual_marks');
        });

        Schema::table('hr_appraisals', function (Blueprint $table) {
            $table->dropConstrainedForeignId('finalized_by');
            $table->dropColumn(['submitted_at', 'finalized_at']);
        });
    }
};
