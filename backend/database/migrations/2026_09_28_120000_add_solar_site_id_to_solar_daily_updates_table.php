<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solar_daily_updates', function (Blueprint $table) {
            $table->unsignedBigInteger('solar_site_id')->nullable()->after('id');
            $table->foreign('solar_site_id')->references('id')->on('solar_sites')->cascadeOnDelete();
            $table->unsignedBigInteger('solar_project_id')->nullable()->change();
        });

        // Backfill: set solar_site_id from the related project
        DB::statement('
            UPDATE solar_daily_updates du
            JOIN solar_projects p ON p.id = du.solar_project_id
            SET du.solar_site_id = p.solar_site_id
        ');
    }

    public function down(): void
    {
        Schema::table('solar_daily_updates', function (Blueprint $table) {
            $table->dropForeign(['solar_site_id']);
            $table->dropColumn('solar_site_id');
        });
    }
};
