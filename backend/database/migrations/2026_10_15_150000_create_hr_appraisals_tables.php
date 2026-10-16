<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Monthly Performance Appraisals ─────────────────────────────────────
        Schema::create('hr_appraisals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hr_employees')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->nullable()->constrained('hr_employees')->nullOnDelete();
            $table->string('period_month', 7); // YYYY-MM e.g. 2026-10
            
            // Workflow Status: draft -> objectives_confirmed -> self_submitted -> manager_evaluated -> hr_reviewed -> approved
            $table->string('status', 30)->default('draft');

            // Scoring & Deductions
            $table->decimal('objective_score', 5, 2)->default(0);      // Max 100.00
            $table->decimal('attendance_deduction', 4, 2)->default(0);  // 0.00 to 10.00
            $table->text('attendance_deduction_notes')->nullable();
            
            $table->decimal('misconduct_deduction', 4, 2)->default(0);  // 0.00 to 30.00
            $table->string('misconduct_severity', 20)->default('none'); // none, minor (0-10), moderate (11-19), serious (20-30)
            $table->text('misconduct_deduction_notes')->nullable();

            $table->decimal('final_score', 5, 2)->default(0);          // Max 100.00
            $table->string('grade', 10)->nullable();                   // S1, S2, A1, A2, C
            $table->string('performance_level', 50)->nullable();       // Outstanding, Excellent, Meets Expectations, Needs Improvement, Unacceptable
            $table->string('variable_pay_adjustment', 50)->nullable(); // e.g. "116% - 120%"

            // Stakeholder Remarks & Approvals
            $table->text('employee_comments')->nullable();
            
            $table->text('manager_comments')->nullable();
            $table->string('manager_recommended_grade', 10)->nullable();
            $table->timestamp('manager_evaluated_at')->nullable();

            $table->text('hr_comments')->nullable();
            $table->foreignId('hr_reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('hr_reviewed_at')->nullable();

            $table->text('director_comments')->nullable();
            $table->foreignId('director_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('director_approved_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['employee_id', 'period_month']);
        });

        // ── Monthly Appraisal Objectives (Up to 5 per employee) ───────────────
        Schema::create('hr_appraisal_objectives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appraisal_id')->constrained('hr_appraisals')->cascadeOnDelete();
            $table->unsignedTinyInteger('order_num')->default(1);
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->decimal('weight', 5, 2)->default(0); // Sum across objectives must be 100%
            $table->date('deadline')->nullable();
            $table->text('target_kpi')->nullable();
            $table->string('status', 25)->default('in_progress'); // not_started, in_progress, completed
            
            // End of Month Employee Submission
            $table->text('achievement')->nullable();
            $table->text('evidence_notes')->nullable();

            // Manager Evaluation
            $table->decimal('marks', 5, 2)->nullable();         // 0 - 100
            $table->decimal('weighted_marks', 5, 2)->nullable(); // marks * (weight / 100)
            $table->text('manager_comments')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_appraisal_objectives');
        Schema::dropIfExists('hr_appraisals');
    }
};
