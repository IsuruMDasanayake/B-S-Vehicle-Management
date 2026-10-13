<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $division = $request->query('division');
        $category = $request->query('category');
        $unreadOnly = $request->boolean('unread_only');
        
        $baseQuery = $user->notifications();
        
        if ($division === 'hr') {
            $baseQuery->where('type', 'like', '%HrNotification%');
        } elseif ($division === 'solar') {
            $baseQuery->where('type', 'like', '%SupervisorUpdateNotification%');
        } elseif ($division === 'vehicle') {
            $baseQuery->where('type', 'not like', '%SupervisorUpdateNotification%')
                      ->where('type', 'not like', '%HrNotification%');
        }

        $unreadCount = (clone $baseQuery)->whereNull('read_at')->count();

        if ($unreadOnly) {
            $baseQuery->whereNull('read_at');
        }

        if ($category) {
            $baseQuery->where('data->category', $category);
        }
        
        return response()->json([
            'unread_count'  => $unreadCount,
            'notifications' => $baseQuery->latest()->take(50)->get(),
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->find($id);
        if ($notification) {
            $notification->markAsRead();
        }
        return response()->json(['message' => 'Marked as read']);
    }

    public function markAllAsRead(Request $request)
    {
        $division = $request->query('division');
        $query = $request->user()->unreadNotifications();

        if ($division === 'hr') {
            $query->where('type', 'like', '%HrNotification%');
        } elseif ($division === 'solar') {
            $query->where('type', 'like', '%SupervisorUpdateNotification%');
        } elseif ($division === 'vehicle') {
            $query->where('type', 'not like', '%SupervisorUpdateNotification%')
                  ->where('type', 'not like', '%HrNotification%');
        }

        $query->update(['read_at' => now()]);
        return response()->json(['message' => 'All marked as read']);
    }
}
