import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SettingsProps {
  onCountdownChange: (value: number) => void;
}

export default function Settings({ onCountdownChange }: SettingsProps) {
  const [countdownDuration, setCountdownDuration] = useState(15);
  const [thresholds, setThresholds] = useState({
    mild: 7,
    moderate: 15,
    severe: 35
  });
  const { toast } = useToast();

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: {
      countdownDuration: number;
      thresholds: typeof thresholds;
    }) => {
      const res = await apiRequest('POST', '/api/settings', settings);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings saved successfully",
        variant: "success"
      });
      // Update the countdown in the parent component
      onCountdownChange(countdownDuration);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({
      countdownDuration,
      thresholds
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="material-icons mr-2 text-blue-500">settings</span>
        Alert Settings
      </h3>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Countdown Duration (seconds)</label>
        <input 
          type="range" 
          min="5" 
          max="30" 
          value={countdownDuration} 
          onChange={(e) => setCountdownDuration(parseInt(e.target.value))} 
          className="w-full" 
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>5s</span>
          <span>{countdownDuration}s</span>
          <span>30s</span>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Impact Force Thresholds</label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block">Mild (G)</label>
            <input 
              type="number" 
              value={thresholds.mild} 
              min="1" 
              max="100" 
              onChange={(e) => setThresholds({...thresholds, mild: parseInt(e.target.value)})} 
              className="border rounded p-2 w-full" 
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Moderate (G)</label>
            <input 
              type="number" 
              value={thresholds.moderate} 
              min="1" 
              max="100" 
              onChange={(e) => setThresholds({...thresholds, moderate: parseInt(e.target.value)})} 
              className="border rounded p-2 w-full" 
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Severe (G)</label>
            <input 
              type="number" 
              value={thresholds.severe} 
              min="1" 
              max="100" 
              onChange={(e) => setThresholds({...thresholds, severe: parseInt(e.target.value)})} 
              className="border rounded p-2 w-full" 
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button 
          onClick={handleSaveSettings}
          disabled={saveSettingsMutation.isPending}
          className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded
            ${saveSettingsMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
