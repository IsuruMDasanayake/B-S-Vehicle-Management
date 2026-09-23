<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solar_daily_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solar_project_id')->constrained('solar_projects')->cascadeOnDelete();
            $table->date('report_date');
            $table->time('start_time')->nullable();
            $table->text('manpower')->nullable();
            $table->text('machines')->nullable();
            $table->string('weather')->nullable();
            $table->text('planned_tasks')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solar_daily_updates');
    }
};
