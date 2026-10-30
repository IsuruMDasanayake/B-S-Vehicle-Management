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
    Route::post('/auth/change-password', [\App\Http\Controllers\Api\AuthController::class, 'changePassword']);
    
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

    // Web Push Notifications (VAPID)
    Route::get('/push/vapid-public-key', [\App\Http\Controllers\Api\WebPushController::class, 'getPublicKey']);
    Route::post('/push/subscribe', [\App\Http\Controllers\Api\WebPushController::class, 'subscribe']);
    Route::post('/push/unsubscribe', [\App\Http\Controllers\Api\WebPushController::class, 'unsubscribe']);
    Route::post('/push/test', [\App\Http\Controllers\Api\WebPushController::class, 'test']);
    
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
        // Daily Updates (site-wise)
        Route::get('sites/{site}/daily-updates', [\App\Http\Controllers\Api\Solar\SolarDailyUpdateController::class, 'index']);
        Route::post('sites/{site}/daily-updates', [\App\Http\Controllers\Api\Solar\SolarDailyUpdateController::class, 'store']);
        Route::put('daily-updates/{id}', [\App\Http\Controllers\Api\Solar\SolarDailyUpdateController::class, 'update']);
        Route::delete('daily-updates/{id}', [\App\Http\Controllers\Api\Solar\SolarDailyUpdateController::class, 'destroy']);

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

    // ── HR Division ────────────────────────────────────────────────────────────
    Route::prefix('hr')->group(function () {
        // Dashboard
        Route::get('dashboard/stats', [\App\Http\Controllers\Api\HR\HrDashboardController::class, 'stats']);

        // Departments
        Route::apiResource('departments', \App\Http\Controllers\Api\HR\HrDepartmentController::class)
            ->parameters(['departments' => 'hrDepartment']);

        // Designations
        Route::apiResource('designations', \App\Http\Controllers\Api\HR\HrDesignationController::class)
            ->parameters(['designations' => 'hrDesignation']);

        // Employees
        Route::get('employees/me', [\App\Http\Controllers\Api\HR\HrEmployeeController::class, 'me']);
        Route::patch('employees/{id}/self-update', [\App\Http\Controllers\Api\HR\HrEmployeeController::class, 'selfUpdate']);
        Route::apiResource('employees', \App\Http\Controllers\Api\HR\HrEmployeeController::class)
            ->parameters(['employees' => 'hrEmployee']);

        // Employee Documents & Assets
        Route::apiResource('employees.documents', \App\Http\Controllers\Api\HR\HrEmployeeDocumentController::class)
            ->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('employees.assets', \App\Http\Controllers\Api\HR\HrEmployeeAssetController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        // Attendance
        Route::apiResource('locations', \App\Http\Controllers\Api\HR\HrLocationController::class);
        Route::post('attendance/clock-in', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'clockIn']);
        Route::post('attendance/clock-out', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'clockOut']);
        Route::post('attendance', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'store']);
        Route::get('attendance/today', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'myToday']);
        Route::get('attendance/my-history', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'myHistory']);
        Route::get('attendance/employee/{id}/history', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'employeeHistory']);
        Route::get('attendance/report', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'report']);
        Route::post('attendance/send-report-email', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'sendReportEmail']);
        Route::get('attendance/calendar', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'calendar']);
        Route::get('attendance', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'index']);
        Route::patch('attendance/{id}', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'update']);
        Route::get('attendance/unclosed-past', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'unclosedOrAutoAttendances']);
        Route::post('attendance/regularize', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'requestRegularization']);
        Route::get('attendance/regularizations', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'listRegularizations']);
        Route::patch('attendance/regularizations/{id}', [\App\Http\Controllers\Api\HR\HrAttendanceController::class, 'updateRegularization']);

        // Leaves
        Route::get('leaves/my-balance', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'myBalance']);
        Route::get('leaves/my-requests', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'myLeaves']);
        Route::post('leaves', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'store']);
        Route::patch('leaves/{id}/cancel', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'cancel']);
        Route::get('leaves', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'index']);
        Route::patch('leaves/{id}/status', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'updateStatus']);
        Route::get('leaves/stats', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'stats']);
        Route::get('leaves/unapproved-counts', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'unapprovedCounts']);
        Route::get('leaves/all-balances', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'allBalances']);
        Route::get('leaves/employee/{id}/balances', [\App\Http\Controllers\Api\HR\HrLeaveController::class, 'employeeBalances']);

        // Announcements
        Route::get('announcements', [\App\Http\Controllers\Api\HR\HrAnnouncementController::class, 'index']);
        Route::post('announcements', [\App\Http\Controllers\Api\HR\HrAnnouncementController::class, 'store']);
        Route::delete('announcements/{id}', [\App\Http\Controllers\Api\HR\HrAnnouncementController::class, 'destroy']);

        // Monthly Performance Appraisals (Simplified MBO Single-Sheet)
        Route::get('appraisals/sheet', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'sheet']);
        Route::get('appraisals/my', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'myAppraisals']);
        Route::get('appraisals/board', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'board']);
        Route::match(['post', 'put'], 'appraisals/objectives', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'saveObjectives']);
        Route::match(['post', 'put'], 'appraisals/{id}/achievements', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'saveAchievements']);
        Route::match(['post', 'put'], 'appraisals/{id}/marks', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'saveMarks']);
        Route::match(['post', 'put'], 'appraisals/{id}/deductions', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'saveDeductions']);
        Route::get('appraisals/{id}/suggest-attendance', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'suggestAttendanceDeduction']);
        Route::post('appraisals/{id}/finalize', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'finalize']);
        Route::post('appraisals/{id}/return', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'returnToEmployee']);
        Route::post('appraisals/{id}/reopen', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'reopen']);
        Route::get('appraisals/{id}/revisions', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'revisions']);
        Route::get('appraisals/employee/{employeeId}/trend', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'employeeTrend']);
        Route::post('appraisals/send-reminder', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'triggerReminders']);
        Route::post('appraisals/{id}/remind-appraiser', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'remindAppraiserForSheet']);
        Route::get('appraisals/{id}', [\App\Http\Controllers\Api\HR\HrAppraisalController::class, 'show']);

        // Employee Training & Video Lessons
        Route::get('training/lessons', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'index']);
        Route::post('training/lessons', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'store']);
        Route::get('training/lessons/{id}', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'show']);
        Route::put('training/lessons/{id}', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'update']);
        Route::delete('training/lessons/{id}', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'destroy']);
        Route::post('training/lessons/{id}/remind', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'remind']);

        // Employee Portal Training
        Route::get('portal/training', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'myLessons']);
        Route::post('portal/training/{id}/progress', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'recordProgress']);
        Route::post('portal/training/{id}/complete', [\App\Http\Controllers\Api\HR\HrTrainingController::class, 'completeLesson']);

        // Super Admin / HR Settings (Mail Report Recipients & Manual Trigger)
        Route::get('settings/mail-reports', [\App\Http\Controllers\Api\HR\HrSettingController::class, 'getMailReportSettings']);
        Route::put('settings/mail-reports', [\App\Http\Controllers\Api\HR\HrSettingController::class, 'saveMailReportSettings']);
        Route::post('settings/mail-reports/send-now', [\App\Http\Controllers\Api\HR\HrSettingController::class, 'sendMailReportNow']);
        Route::get('settings/mail-reports/download', [\App\Http\Controllers\Api\HR\HrSettingController::class, 'downloadMailReport']);
    });
});

// ── Solar Supervisor Upload (Public — no auth, token-based) ───────────────────
Route::prefix('upload')->group(function () {
    Route::get('{token}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'getSiteData']);
    Route::post('{token}/submit', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'submit']);
    Route::post('{token}/daily-updates', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'submitDailyUpdate']);
    Route::put('{token}/daily-updates/{updateId}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'updateDailyUpdate']);
    Route::post('{token}/daily-updates/{updateId}/images', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'addDailyUpdateImages']);
    Route::delete('{token}/daily-update-images/{imageId}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'deleteDailyUpdateImage']);
    Route::get('{token}/history', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'history']);
    Route::delete('{token}/daily-updates/{updateId}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'deleteDailyUpdate']);
    Route::put('{token}/batches/{batchId}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'updateBatch']);
    Route::post('{token}/batches/{batchId}/images', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'addImages']);
    Route::delete('{token}/images/{imageId}', [\App\Http\Controllers\Api\Solar\SolarUploadController::class, 'deleteImage']);
    Route::get('{token}/notifications', [\App\Http\Controllers\Api\Solar\SolarSiteNotificationController::class, 'index']);
    Route::patch('{token}/notifications/{notificationId}/read', [\App\Http\Controllers\Api\Solar\SolarSiteNotificationController::class, 'markAsRead']);
});


