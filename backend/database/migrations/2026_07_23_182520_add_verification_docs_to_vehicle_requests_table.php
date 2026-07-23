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
        Schema::table('vehicle_requests', function (Blueprint $table) {
            $table->string('whatsapp_number')->nullable()->after('requester_contact');
            $table->string('id_card_front_path')->nullable();
            $table->string('id_card_back_path')->nullable();
            $table->string('drivers_license_path')->nullable();
            $table->string('residency_bill_path')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_requests', function (Blueprint $table) {
            $table->dropColumn([
                'whatsapp_number',
                'id_card_front_path',
                'id_card_back_path',
                'drivers_license_path',
                'residency_bill_path'
            ]);
        });
    }
};
