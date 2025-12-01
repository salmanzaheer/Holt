import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus, Trash2, Edit, Lock, Copy } from 'lucide-react';
import { getPasswords, createPassword, deletePassword, updatePassword, revealPassword } from '../services/api';

const Passwords = () => {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ site_name: '', site_url: '', username: '', password: '', notes: '' });
  const [revealed, setRevealed] = useState({}); // Map of id -> decrypted_password

  useEffect(() => {
    loadPasswords();
  }, []);

  const loadPasswords = async () => {
    try {
      const res = await getPasswords();
      setPasswords(res.data.passwords);
    } catch (error) {
      console.error("Failed to load passwords", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updatePassword(editingId, formData);
      } else {
        await createPassword(formData);
      }
      setModalOpen(false);
      setFormData({ site_name: '', site_url: '', username: '', password: '', notes: '' });
      setEditingId(null);
      loadPasswords();
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to save password");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deletePassword(id);
      loadPasswords();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleReveal = async (id) => {
    if (revealed[id]) {
      // Hide
      const newRevealed = { ...revealed };
      delete newRevealed[id];
      setRevealed(newRevealed);
    } else {
      // Show
      try {
        const res = await revealPassword(id);
        setRevealed(prev => ({ ...prev, [id]: res.data.password }));
      } catch (error) {
        console.error("Reveal failed", error);
        alert("Could not decrypt password");
      }
    }
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setFormData({ 
      site_name: p.site_name, 
      site_url: p.site_url || '', 
      username: p.username || '', 
      password: '', // Don't prefill encrypted
      notes: p.notes || '' 
    });
    setModalOpen(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could show a toast here
  };

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Lock className="w-6 h-6" /> Your Passwords
          </h1>
          <button 
            onClick={() => { setEditingId(null); setFormData({ site_name: '', site_url: '', username: '', password: '', notes: '' }); setModalOpen(true); }}
            className="btn btn-primary gap-2"
          >
            <Plus className="w-4 h-4" /> Add Password
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center"><span className="loading loading-spinner loading-lg"></span></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passwords.map((p) => (
              <div key={p.id} className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <h2 className="card-title flex justify-between">
                    {p.site_name}
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="btn btn-ghost btn-xs"><Edit className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(p.id)} className="btn btn-ghost btn-xs text-error"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </h2>
                  {p.site_url && <a href={p.site_url} target="_blank" rel="noopener noreferrer" className="link link-primary text-sm truncate">{p.site_url}</a>}
                  {p.username && <p className="text-sm text-gray-500">User: <span className="font-medium text-base-content">{p.username}</span></p>}
                  
                  <div className="flex items-center gap-2 mt-2 bg-base-200 p-2 rounded-lg">
                     <div className="flex-1 font-mono truncate text-sm">
                        {revealed[p.id] ? revealed[p.id] : "••••••••••••"}
                     </div>
                     <button onClick={() => handleReveal(p.id)} className="btn btn-square btn-xs btn-ghost">
                        {revealed[p.id] ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                     </button>
                     {revealed[p.id] && (
                       <button onClick={() => copyToClipboard(revealed[p.id])} className="btn btn-square btn-xs btn-ghost">
                         <Copy className="w-4 h-4"/>
                       </button>
                     )}
                  </div>
                  {p.notes && <p className="text-xs text-gray-400 mt-2">{p.notes}</p>}
                </div>
              </div>
            ))}
            {passwords.length === 0 && <p className="text-center col-span-full text-gray-500">No passwords saved yet.</p>}
          </div>
        )}

        {modalOpen && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">{editingId ? 'Edit Password' : 'New Password'}</h3>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input 
                  type="text" placeholder="Site Name (e.g. Google)" className="input input-bordered" 
                  value={formData.site_name} onChange={e => setFormData({...formData, site_name: e.target.value})} required 
                />
                <input 
                  type="url" placeholder="URL (optional)" className="input input-bordered" 
                  value={formData.site_url} onChange={e => setFormData({...formData, site_url: e.target.value})} 
                />
                <input 
                  type="text" placeholder="Username (optional)" className="input input-bordered" 
                  value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} 
                />
                <input 
                  type="password" placeholder={editingId ? "New Password (leave blank to keep current)" : "Password"} className="input input-bordered" 
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
                  required={!editingId}
                />
                <textarea 
                  placeholder="Notes (optional)" className="textarea textarea-bordered" 
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                ></textarea>
                <div className="modal-action">
                   <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
                   <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default Passwords;
