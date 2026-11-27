<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Finance User Roles inside Solar Finance
        Schema::create('solar_finance_user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('finance_role')->default('site_supervisor'); 
            // accountant, site_supervisor, project_manager, project_director, director, engineer, finance_admin
            $table->decimal('max_request_limit', 12, 2)->default(25000.00);
            $table->integer('approval_tier')->default(1);
            $table->boolean('can_approve')->default(false);
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 2. System-Generated Mobile Access Tokens for Field Employees
        Schema::create('solar_finance_mobile_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->dateTime('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 3. Petty Cash Accounts (Custodians / Sites / HQ)
        Schema::create('solar_petty_cash_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('account_name');
            $table->foreignId('custodian_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('solar_project_id')->nullable()->constrained('solar_projects')->nullOnDelete();
            $table->decimal('initial_float', 12, 2)->default(0.00);
            $table->decimal('current_balance', 12, 2)->default(0.00);
            $table->decimal('min_threshold', 12, 2)->default(5000.00);
            $table->enum('status', ['active', 'frozen', 'closed'])->default('active');
            $table->timestamps();
        });

        // 4. Petty Cash Transactions & Vouchers
        Schema::create('solar_petty_cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('solar_petty_cash_accounts')->cascadeOnDelete();
            $table->string('voucher_no');
            $table->enum('type', ['expense', 'replenishment'])->default('expense');
            $table->decimal('amount', 12, 2);
            $table->string('paid_to')->nullable();
            $table->string('category')->default('general');
            $table->foreignId('solar_project_id')->nullable()->constrained('solar_projects')->nullOnDelete();
            $table->string('receipt_url')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 5. Cash Requests & Advance Approvals
        Schema::create('solar_cash_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_no')->unique();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('solar_project_id')->nullable()->constrained('solar_projects')->nullOnDelete();
            $table->decimal('amount_requested', 12, 2);
            $table->decimal('amount_approved', 12, 2)->nullable();
            $table->string('category')->default('materials');
            $table->text('purpose');
            $table->enum('urgency', ['normal', 'urgent', 'emergency'])->default('normal');
            $table->string('receipt_proof_url')->nullable();
            $table->enum('status', [
                'pending_pm',
                'pending_director',
                'approved',
                'disbursed',
                'settled',
                'rejected'
            ])->default('pending_pm');
            $table->string('current_approver_role')->nullable();
            $table->dateTime('disbursed_at')->nullable();
            $table->dateTime('settled_at')->nullable();
            $table->decimal('settled_amount', 12, 2)->nullable();
            $table->decimal('returned_cash_amount', 12, 2)->nullable();
            $table->timestamps();
        });

        // 6. Cash Request Approval Logs
        Schema::create('solar_cash_request_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_request_id')->constrained('solar_cash_requests')->cascadeOnDelete();
            $table->foreignId('approver_id')->constrained('users')->cascadeOnDelete();
            $table->string('approver_role');
            $table->enum('action', ['approved', 'rejected', 'amended'])->default('approved');
            $table->text('comments')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solar_cash_request_approvals');
        Schema::dropIfExists('solar_cash_requests');
        Schema::dropIfExists('solar_petty_cash_transactions');
        Schema::dropIfExists('solar_petty_cash_accounts');
        Schema::dropIfExists('solar_finance_mobile_tokens');
        Schema::dropIfExists('solar_finance_user_roles');
    }
};
