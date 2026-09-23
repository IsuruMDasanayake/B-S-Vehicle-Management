<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Auth routes
Route::post('/auth/login', [\App\Http\Controllers\Api\AuthController::class, 'login']);
Route::post('/auth/driver/login', [\App\Http\Controllers\Api\AuthController::class, 'driverLogin']);

// GPS Webhook from Traccar (No Auth Required)
Route::post('/gps/webhook', [\App\Http\Controllers\Api\Vehicle\GpsWebhookController::class, 'handleTraccarWebhook']);

use App\Http\Controllers\Api\Vehicle\OwnerPaymentController;
use App\Http\Controllers\Api\Vehicle\VehiclePaymentController;
use App\Http\Controllers\Api\Vehicle\AlertsController;

Route::post('/public/vehicle-requests', [\App\Http\Controllers\Api\Vehicle\VehicleRequestController::class, 'publicStore']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
    Route::get('/auth/me', [\App\Http\Controllers\Api\AuthController::class, 'me']);
    
    // Dashboard & Settings
    Route::get('/dashboard/stats', [\App\Http\Controllers\Api\Vehicle\DashboardController::class, 'stats']);
    Route::get('settings', [\App\Http\Controllers\SettingController::class, 'index']);
    Route::post('settings/batch', [\App\Http\Controllers\SettingController::class, 'updateBatch']);
    Route::get('/reports/summary', [\App\Http\Controllers\Api\Vehicle\ReportController::class, 'summary']);
    
    // Resource Routes
    Route::apiResource('vehicles', \App\Http\Controllers\Api\Vehicle\VehicleController::class);
    Route::apiResource('drivers', \App\Http\Controllers\Api\Vehicle\DriverController::class);
    Route::apiResource('assignments', \App\Http\Controllers\Api\Vehicle\VehicleAssignmentController::class);
    Route::apiResource('fuel-entries', \App\Http\Controllers\Api\Vehicle\FuelEntryController::class);
    Route::apiResource('maintenance-records', \App\Http\Controllers\Api\Vehicle\MaintenanceRecordController::class);
    Route::apiResource('breakdowns', \App\Http\Controllers\Api\Vehicle\BreakdownController::class);
    Route::apiResource('gps-logs', \App\Http\Controllers\Api\Vehicle\GpsLogController::class);
    Route::apiResource('trips', \App\Http\Controllers\Api\Vehicle\TripController::class);
    Route::apiResource('routes', \App\Http\Controllers\Api\Vehicle\RouteController::class);
    Route::apiResource('inspections', \App\Http\Controllers\Api\Vehicle\InspectionController::class);
    Route::apiResource('insurance-policies', \App\Http\Controllers\Api\Vehicle\InsurancePolicyController::class);
    Route::apiResource('revenue-licenses', \App\Http\Controllers\Api\Vehicle\RevenueLicenseController::class);
    Route::apiResource('emission-tests', \App\Http\Controllers\Api\Vehicle\EmissionTestController::class);
    Route::apiResource('accidents', \App\Http\Controllers\Api\Vehicle\AccidentController::class);
    Route::apiResource('tires', \App\Http\Controllers\Api\Vehicle\TireController::class);
    Route::apiResource('spare-parts', \App\Http\Controllers\Api\Vehicle\SparePartController::class);
    Route::apiResource('expenses', \App\Http\Controllers\Api\Vehicle\ExpenseController::class);
    Route::delete('accidents/{accident}/photos/{index}', [\App\Http\Controllers\Api\Vehicle\AccidentController::class, 'removePhoto']);
    Route::delete('accidents/{accident}/police-report', [\App\Http\Controllers\Api\Vehicle\AccidentController::class, 'removePoliceReport']);
    Route::apiResource('vendors', \App\Http\Controllers\Api\Vehicle\VendorController::class);
    Route::apiResource('departments', \App\Http\Controllers\Api\Vehicle\DepartmentController::class);
    Route::apiResource('vehicle-requests', \App\Http\Controllers\Api\Vehicle\VehicleRequestController::class);
    Route::apiResource('users', \App\Http\Controllers\Api\Vehicle\UserController::class);
    
    // Daily Ride Logs
    Route::apiResource('daily-ride-logs', \App\Http\Controllers\Api\Vehicle\DailyRideLogController::class);
    Route::get('driver-deposits/summary', [\App\Http\Controllers\Api\Vehicle\DriverDepositController::class, 'dailySummary']);
    Route::get('driver-balances', [\App\Http\Controllers\Api\Vehicle\DriverDepositController::class, 'driverBalances']);
    Route::apiResource('driver-deposits', \App\Http\Controllers\Api\Vehicle\DriverDepositController::class);
    Route::patch('driver-deposits/{driver_deposit}/status', [\App\Http\Controllers\Api\Vehicle\DriverDepositController::class, 'updateStatus']);
    Route::patch('daily-ride-logs/{daily_ride_log}/status', [\App\Http\Controllers\Api\Vehicle\DailyRideLogController::class, 'updateStatus']);
    Route::get('daily-ride-logs-analytics', [\App\Http\Controllers\Api\Vehicle\DailyRideLogController::class, 'analytics']);
    Route::get('intelligence/drivers', [\App\Http\Controllers\Api\Vehicle\PerformanceIntelligenceController::class, 'drivers']);
    Route::get('intelligence', [\App\Http\Controllers\Api\Vehicle\PerformanceIntelligenceController::class, 'intelligence']);
    
    Route::delete('attachments/{attachment}', [\App\Http\Controllers\Api\AttachmentController::class, 'destroy']);
    Route::get('/activity-logs', [\App\Http\Controllers\Api\ActivityLogController::class, 'index']);

    // Notifications
    Route::post('/notifications/generate', [\App\Http\Controllers\Api\NotificationGeneratorController::class, 'generate']);
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/mark-all-read', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/{id}/mark-read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    
    // Owner Payments
    Route::apiResource('owner-payments', OwnerPaymentController::class);

    // Alerts and Activity Feed
    Route::get('alerts', [AlertsController::class, 'index']);
    Route::patch('alerts/{id}/read', [AlertsController::class, 'markAsRead']);
    
    // Vehicle (Rental Income) Payments
    Route::apiResource('vehicle-payments', VehiclePaymentController::class);

    // GPS Dashboard
    Route::get('/gps-dashboard/current', [\App\Http\Controllers\Api\Vehicle\GpsDashboardController::class, 'currentLocations']);
    Route::get('/gps-dashboard/statistics', [\App\Http\Controllers\Api\Vehicle\GpsDashboardController::class, 'statistics']);
    Route::get('/gps-dashboard/{vehicleId}/history', [\App\Http\Controllers\Api\Vehicle\GpsDashboardController::class, 'history']);
    
    // Geofences
    Route::apiResource('geofences', \App\Http\Controllers\GeofenceController::class);

    // ── Solar Division (Admin) ─────────────────────────────────────────────────
    Route::prefix('solar')->group(function () {
        // Sites
        Route::apiResource('sites', \App\Http\Controllers\Api\Solar\SolarSiteController::class);
        Route::post('sites/{solarSite}/regenerate-token', [\App\Http\Controllers\Api\Solar\SolarSiteController::class, 'regenerateToken']);

        // Notifications
        Route::get('notifications/history', [\App\Http\Controllers\Api\Solar\SolarSiteNotificationController::class, 'history']);
        Route::post('notifications/send', [\App\Http\Controllers\Api\Solar\SolarSiteNotificationController::class, 'sendManual']);

        // Templates
        Route::apiResource('templates', \App\Http\Controllers\Api\Solar\SectionTemplateController::class);

        // Projects
        Route::apiResource('projects', \App\Http\Controllers\Api\Solar\SolarProjectController::class);
        Route::post('projects/{project}/milestones', [\App\Http\Controllers\Api\Solar\SolarProjectController::class, 'addMilestone']);
        Route::delete('milestones/{solarSection}', [\App\Http\Controllers\Api\Solar\SolarProjectController::class, 'deleteMilestone']);

        // Upload Batches (read + delete)
        Route::get('upload-batches', [\App\Http\Controllers\Api\Solar\SolarUploadBatchController::class, 'index']);
        Route::get('upload-batches/{solarUploadBatch}', [\App\Http\Controllers\Api\Solar\SolarUploadBatchController::class, 'show']);
        Route::put('upload-batches/{solarUploadBatch}', [\App\Http\Controllers\Api\Solar\SolarUploadBatchController::class, 'update']);
        Route::delete('upload-batches/{solarUploadBatch}', [\App\Http\Controllers\Api\Solar\SolarUploadBatchController::class, 'destroy']);
        Route::post('upload-batches/{solarUploadBatch}/images', [\App\Http\Controllers\Api\Solar\SolarUploadBatchController::class, 'addImages']);

        // Images (flag + delete)
        Route::patch('images/{solarImage}/flag', [\App\Http\Controllers\Api\Solar\SolarImageController::class, 'flag']);
        Route::delete('images/{solarImage}', [\App\Http\Controllers\Api\Solar\SolarImageController::class, 'destroy']);

        // Dashboard stats
        Route::get('stats', [\App\Http\Controllers\Api\Solar\SolarDashboardController::class, 'stats']);
    });
});

// ── Solar Supervisor Upload (Public — no auth, token-based) ───────────────────
Route::prefix('upload')->group(function () {
    Route::get('{token}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'getSiteData']);
    Route::post('{token}/submit', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'submit']);
    Route::get('{token}/history', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'history']);
    Route::put('{token}/batches/{batchId}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'updateBatch']);
    Route::post('{token}/batches/{batchId}/images', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'addImages']);
    Route::delete('{token}/images/{imageId}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'deleteImage']);
    Route::get('{token}/notifications', [\App\Http\Controllers\Api\Solar\SolarSiteNotificationController::class, 'index']);
    Route::patch('{token}/notifications/{notificationId}/read', [\App\Http\Controllers\Api\Solar\SolarSiteNotificationController::class, 'markAsRead']);
});


