<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solar_projects', function (Blueprint $table) {
            $table->decimal('contract_value', 14, 2)->default(0.00)->after('status');
            $table->decimal('budget_limit', 14, 2)->default(0.00)->after('contract_value');
        });
    }

    public function down(): void
    {
        Schema::table('solar_projects', function (Blueprint $table) {
            $table->dropColumn(['contract_value', 'budget_limit']);
        });
    }
};
