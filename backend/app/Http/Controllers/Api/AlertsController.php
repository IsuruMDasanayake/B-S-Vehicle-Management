<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class AlertsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // 1. Fetch User Activity (last 100 records for performance)
        $activities = Activity::with(['causer', 'subject'])->latest()->take(100)->get()->map(function ($activity) {
            $subjectName = '-';
            if ($activity->subject) {
                // Try to get vehicle number if it's related to a vehicle
                $vehicleNum = null;
                if (method_exists($activity->subject, 'vehicle') && $activity->subject->vehicle) {
                    $vehicleNum = $activity->subject->vehicle->vehicle_number;
                }

                $subjectName = $activity->subject->vehicle_number 
                    ?? $activity->subject->name 
                    ?? $activity->subject->reference_number 
                    ?? $activity->subject->title
                    ?? $vehicleNum
                    ?? '#' . $activity->subject->id;
            }

            // Convert "MaintenanceRecord" to "Maintenance Record"
            $subjectTypeRaw = class_basename($activity->subject_type);
            $subjectTypeFormatted = preg_replace('/(?<!^)([A-Z])/', ' \\1', $subjectTypeRaw);

            return [
                'id' => 'act_' . $activity->id,
                'type' => 'activity',
                'description' => $activity->description,
                'subject_type' => $subjectTypeFormatted,
                'subject_name' => $subjectName,
                'causer_name' => $activity->causer ? $activity->causer->name : 'System',
                'properties' => $activity->properties,
                'created_at' => $activity->created_at,
            ];
        });

        // 2. Fetch System Alerts for this user
        $notifications = $user->notifications()->take(100)->get()->map(function ($notification) {
            return [
                'id' => $notification->id,
                'type' => 'alert',
                'alert_type' => $notification->data['type'] ?? 'info',
                'title' => $notification->data['title'] ?? 'System Alert',
                'message' => $notification->data['message'] ?? '',
                'source_type' => $notification->data['source_type'] ?? null,
                'source_id' => $notification->data['source_id'] ?? null,
                'read_at' => $notification->read_at,
                'created_at' => $notification->created_at,
            ];
        });

        // Merge and sort by created_at descending
        $feed = $activities->concat($notifications)->sortByDesc('created_at')->values();

        return response()->json([
            'success' => true,
            'data' => $feed
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->find($id);
        
        if ($notification) {
            $notification->markAsRead();
            return response()->json(['success' => true, 'message' => 'Alert marked as read']);
        }

        return response()->json(['success' => false, 'message' => 'Alert not found'], 404);
    }
}
