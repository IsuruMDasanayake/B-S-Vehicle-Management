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
Route::post('/gps/webhook', [\App\Http\Controllers\Api\GpsWebhookController::class, 'handleTraccarWebhook']);

use App\Http\Controllers\Api\OwnerPaymentController;
use App\Http\Controllers\Api\VehiclePaymentController;
use App\Http\Controllers\Api\AlertsController;

Route::post('/public/vehicle-requests', [\App\Http\Controllers\Api\VehicleRequestController::class, 'publicStore']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
    Route::get('/auth/me', [\App\Http\Controllers\Api\AuthController::class, 'me']);
    
    // Dashboard & Settings
    Route::get('/dashboard/stats', [\App\Http\Controllers\Api\DashboardController::class, 'stats']);
    Route::get('settings', [\App\Http\Controllers\SettingController::class, 'index']);
    Route::post('settings/batch', [\App\Http\Controllers\SettingController::class, 'updateBatch']);
    Route::get('/reports/summary', [\App\Http\Controllers\Api\ReportController::class, 'summary']);
    
    // Resource Routes
    Route::apiResource('vehicles', \App\Http\Controllers\Api\VehicleController::class);
    Route::apiResource('drivers', \App\Http\Controllers\Api\DriverController::class);
    Route::apiResource('assignments', \App\Http\Controllers\Api\VehicleAssignmentController::class);
    Route::apiResource('fuel-entries', \App\Http\Controllers\Api\FuelEntryController::class);
    Route::apiResource('maintenance-records', \App\Http\Controllers\Api\MaintenanceRecordController::class);
    Route::apiResource('breakdowns', \App\Http\Controllers\Api\BreakdownController::class);
    Route::apiResource('gps-logs', \App\Http\Controllers\Api\GpsLogController::class);
    Route::apiResource('trips', \App\Http\Controllers\Api\TripController::class);
    Route::apiResource('routes', \App\Http\Controllers\Api\RouteController::class);
    Route::apiResource('inspections', \App\Http\Controllers\Api\InspectionController::class);
    Route::apiResource('insurance-policies', \App\Http\Controllers\Api\InsurancePolicyController::class);
    Route::apiResource('revenue-licenses', \App\Http\Controllers\Api\RevenueLicenseController::class);
    Route::apiResource('emission-tests', \App\Http\Controllers\Api\EmissionTestController::class);
    Route::apiResource('accidents', \App\Http\Controllers\Api\AccidentController::class);
    Route::apiResource('tires', \App\Http\Controllers\Api\TireController::class);
    Route::apiResource('spare-parts', \App\Http\Controllers\Api\SparePartController::class);
    Route::apiResource('expenses', \App\Http\Controllers\Api\ExpenseController::class);
    Route::delete('accidents/{accident}/photos/{index}', [\App\Http\Controllers\Api\AccidentController::class, 'removePhoto']);
    Route::delete('accidents/{accident}/police-report', [\App\Http\Controllers\Api\AccidentController::class, 'removePoliceReport']);
    Route::apiResource('vendors', \App\Http\Controllers\Api\VendorController::class);
    Route::apiResource('departments', \App\Http\Controllers\Api\DepartmentController::class);
    Route::apiResource('vehicle-requests', \App\Http\Controllers\Api\VehicleRequestController::class);
    Route::apiResource('users', \App\Http\Controllers\Api\UserController::class);
    
    // Daily Ride Logs
    Route::apiResource('daily-ride-logs', \App\Http\Controllers\Api\DailyRideLogController::class);
    Route::get('driver-deposits/summary', [\App\Http\Controllers\Api\DriverDepositController::class, 'dailySummary']);
    Route::get('driver-balances', [\App\Http\Controllers\Api\DriverDepositController::class, 'driverBalances']);
    Route::apiResource('driver-deposits', \App\Http\Controllers\Api\DriverDepositController::class);
    Route::patch('driver-deposits/{driver_deposit}/status', [\App\Http\Controllers\Api\DriverDepositController::class, 'updateStatus']);
    Route::patch('daily-ride-logs/{daily_ride_log}/status', [\App\Http\Controllers\Api\DailyRideLogController::class, 'updateStatus']);
    Route::get('daily-ride-logs-analytics', [\App\Http\Controllers\Api\DailyRideLogController::class, 'analytics']);
    
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
    Route::get('/gps-dashboard/current', [\App\Http\Controllers\Api\GpsDashboardController::class, 'currentLocations']);
    Route::get('/gps-dashboard/statistics', [\App\Http\Controllers\Api\GpsDashboardController::class, 'statistics']);
    Route::get('/gps-dashboard/{vehicleId}/history', [\App\Http\Controllers\Api\GpsDashboardController::class, 'history']);
    
    // Geofences
    Route::apiResource('geofences', \App\Http\Controllers\GeofenceController::class);
});
