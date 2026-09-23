<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SolarSite;
use App\Notifications\SiteSupervisorNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SolarSiteNotificationController extends Controller
{
    /**
     * Get unread notifications for a site by token.
     */
    public function index(Request $request, $token)
    {
        $site = SolarSite::where('supervisor_token', $token)
                         ->where('is_active', true)
                         ->firstOrFail();

        return response()->json([
            'data' => $site->notifications()->limit(20)->get()
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, $token, $notificationId)
    {
        $site = SolarSite::where('supervisor_token', $token)
                         ->where('is_active', true)
                         ->firstOrFail();

        $notification = $site->notifications()->findOrFail($notificationId);
        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read'
        ]);
    }

    /**
     * Admin: Get notification history for all sites or a specific site
     */
    public function history(Request $request)
    {
        $query = DB::table('notifications')
            ->where('notifiable_type', SolarSite::class)
            ->join('solar_sites', 'notifications.notifiable_id', '=', 'solar_sites.id')
            ->select('notifications.*', 'solar_sites.name as site_name')
            ->orderBy('created_at', 'desc');

        if ($request->has('site_id')) {
            $query->where('notifiable_id', $request->site_id);
        }

        $notifications = $query->paginate(20);

        // Decode JSON data column
        $notifications->getCollection()->transform(function ($notification) {
            $notification->data = json_decode($notification->data, true);
            return $notification;
        });

        return response()->json($notifications);
    }

    /**
     * Admin: Send a manual notification
     */
    public function sendManual(Request $request)
    {
        $validated = $request->validate([
            'site_id' => 'required', // can be 'all' or an integer
            'title'   => 'required|string|max:255',
            'message' => 'required|string',
            'type'    => 'required|in:info,warning,success,error'
        ]);

        $notification = new SiteSupervisorNotification(
            $validated['title'],
            $validated['message'],
            $validated['type'],
            $request->user()->name ?? 'Admin'
        );

        if ($validated['site_id'] === 'all') {
            $sites = SolarSite::where('is_active', true)->get();
            foreach ($sites as $site) {
                $site->notify($notification);
            }
        } else {
            $site = SolarSite::findOrFail($validated['site_id']);
            $site->notify($notification);
        }

        return response()->json(['message' => 'Notification sent successfully']);
    }
}
