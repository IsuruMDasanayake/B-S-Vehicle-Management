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
        
        $query = $user->notifications();
        
        if ($division === 'solar') {
            $query->where('type', 'like', '%SupervisorUpdateNotification%');
        } elseif ($division === 'vehicle') {
            $query->where('type', 'not like', '%SupervisorUpdateNotification%');
        }
        
        return response()->json([
            'unread_count' => $query->whereNull('read_at')->count(),
            'notifications' => $user->notifications()->when($division === 'solar', function ($q) {
                return $q->where('type', 'like', '%SupervisorUpdateNotification%');
            })->when($division === 'vehicle', function ($q) {
                return $q->where('type', 'not like', '%SupervisorUpdateNotification%');
            })->take(50)->get(),
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
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'All marked as read']);
    }
}
