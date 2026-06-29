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
            $table->unsignedBigInteger('requester_id')->nullable()->change();
            $table->string('purpose')->nullable()->change();
            
            $table->string('requester_name')->nullable()->after('requester_id');
            $table->string('requester_email')->nullable()->after('requester_name');
            $table->string('requester_contact')->nullable()->after('requester_email');
            $table->string('requested_vehicle_type')->nullable()->after('requester_contact');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_requests', function (Blueprint $table) {
            $table->unsignedBigInteger('requester_id')->nullable(false)->change();
            $table->string('purpose')->nullable(false)->change();

            $table->dropColumn([
                'requester_name',
                'requester_email',
                'requester_contact',
                'requested_vehicle_type'
            ]);
        });
    }
};
