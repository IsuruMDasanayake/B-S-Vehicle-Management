<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('hr_probation_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hr_employees')->onDelete('cascade');
            $table->date('probation_end_date');
            $table->date('initiation_date');
            $table->date('submission_deadline');
            $table->enum('status', [
                'initiated',
                'in_progress',
                'pending_hr_review',
                'pending_ceo_approval',
                'completed',
                'cancelled'
            ])->default('initiated');

            $table->foreignId('line_manager_id')->nullable()->constrained('hr_employees')->nullOnDelete();
            $table->foreignId('gm_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ceo_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('hr_user_id')->nullable()->constrained('users')->nullOnDelete();

            // 10-minute Presentation Request
            $table->boolean('presentation_requested')->default(false);
            $table->enum('presentation_status', ['none', 'requested', 'scheduled', 'declined'])->default('none');
            $table->dateTime('presentation_scheduled_at')->nullable();
            $table->text('presentation_notes')->nullable();

            // Weighted Scores (Calculated automatically)
            $table->decimal('self_score', 5, 2)->nullable();         // Max 10 (10% weight)
            $table->decimal('line_manager_score', 5, 2)->nullable(); // Max 30 (30% weight)
            $table->decimal('gm_score', 5, 2)->nullable();           // Max 20 (20% weight)
            $table->decimal('ceo_score', 5, 2)->nullable();          // Max 20 (20% weight)
            $table->decimal('peer_avg_score', 5, 2)->nullable();     // Max 10 (10% weight, average of 2-3 peers)
            $table->decimal('hr_score', 5, 2)->nullable();           // Max 10 (10% weight)
            $table->decimal('final_score', 5, 2)->nullable();        // Max 100
            $table->boolean('threshold_met')->nullable();            // true if >= 80.00

            // Recommendations
            $table->enum('line_manager_recommendation', ['confirm', 'extend', 'do_not_confirm'])->nullable();
            $table->enum('gm_recommendation', ['confirm', 'extend', 'do_not_confirm'])->nullable();
            $table->enum('hr_recommendation', ['confirm', 'extend', 'do_not_confirm'])->nullable();
            $table->date('proposed_extension_date')->nullable();
            $table->text('improvement_objectives')->nullable();
            $table->text('hr_review_notes')->nullable();
            $table->dateTime('hr_reviewed_at')->nullable();
            $table->foreignId('hr_reviewed_by')->nullable()->constrained('users')->nullOnDelete();

            // CEO Final Decision
            $table->enum('ceo_decision', ['confirm', 'extend', 'do_not_confirm'])->nullable();
            $table->text('ceo_notes')->nullable();
            $table->dateTime('ceo_approved_at')->nullable();
            $table->foreignId('ceo_approved_by')->nullable()->constrained('users')->nullOnDelete();

            // Status Update Execution
            $table->dateTime('final_outcome_applied_at')->nullable();
            $table->foreignId('final_outcome_applied_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('hr_probation_evaluator_forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('probation_evaluation_id')
                ->constrained('hr_probation_evaluations')
                ->onDelete('cascade');
            $table->enum('evaluator_role', ['self', 'line_manager', 'gm_pd', 'ceo', 'peer', 'hr']);
            $table->foreignId('evaluator_employee_id')->nullable()->constrained('hr_employees')->nullOnDelete();
            $table->foreignId('evaluator_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('evaluator_name')->nullable();
            $table->unsignedTinyInteger('peer_index')->nullable(); // 1, 2, 3

            // Peer approval by HR
            $table->enum('peer_approval_status', ['not_applicable', 'pending_hr', 'approved', 'rejected'])
                ->default('not_applicable');

            // Form Status & Timestamps
            $table->enum('status', ['pending', 'draft', 'submitted'])->default('pending');
            $table->dateTime('submitted_at')->nullable();

            // Structured Ratings & Qualitative Feedback
            $table->json('ratings')->nullable();
            $table->decimal('form_score', 5, 2)->nullable(); // Raw score out of 100
            $table->enum('recommendation', ['confirm', 'extend', 'do_not_confirm'])->nullable();
            $table->date('proposed_extension_date')->nullable();
            $table->text('general_comments')->nullable();

            // Fields specific to self-evaluation
            $table->text('achievements_evidence')->nullable();
            $table->text('challenges_support')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hr_probation_evaluator_forms');
        Schema::dropIfExists('hr_probation_evaluations');
    }
};
