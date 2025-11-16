// Admin page functions for approving/rejecting wishlists and practitioners

window.approveWishlist = async function(id) {
  if (!confirm('Approve this wishlist and make it publicly visible?')) return;
  
  try {
    const basePath = window.location.pathname.includes('/oss-wishlist-website') ? '/oss-wishlist-website/' : '/';
    const response = await fetch(`${basePath}api/admin/approve-wishlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    
    if (response.ok) {
      alert('Wishlist approved successfully');
      window.location.reload();
    } else {
      alert('Failed to approve wishlist');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.rejectWishlist = async function(id) {
  if (!confirm('Are you sure you want to reject this wishlist? This action will update the status to rejected.')) return;
  
  try {
    const basePath = window.location.pathname.includes('/oss-wishlist-website') ? '/oss-wishlist-website/' : '/';
    const response = await fetch(`${basePath}api/admin/reject-wishlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    
    if (response.ok) {
      alert('Wishlist rejected');
      window.location.reload();
    } else {
      alert('Failed to reject wishlist');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.approvePractitioner = async function(id) {
  if (!confirm('Approve this practitioner and make their profile publicly visible?')) return;
  
  try {
    const basePath = window.location.pathname.includes('/oss-wishlist-website') ? '/oss-wishlist-website/' : '/';
    const response = await fetch(`${basePath}api/admin/approve-practitioner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    
    if (response.ok) {
      alert('Practitioner approved successfully');
      window.location.reload();
    } else {
      alert('Failed to approve practitioner');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.rejectPractitioner = async function(id) {
  if (!confirm('Are you sure you want to reject this practitioner application? This action will update the status to rejected.')) return;
  
  try {
    const basePath = window.location.pathname.includes('/oss-wishlist-website') ? '/oss-wishlist-website/' : '/';
    const response = await fetch(`${basePath}api/admin/reject-practitioner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    
    if (response.ok) {
      alert('Practitioner application rejected');
      window.location.reload();
    } else {
      alert('Failed to reject practitioner');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.moveToPending = async function(id) {
  if (!confirm('Move this wishlist back to pending status?')) return;
  
  try {
    const basePath = window.location.pathname.includes('/oss-wishlist-website') ? '/oss-wishlist-website/' : '/';
    const response = await fetch(`${basePath}api/admin/move-to-pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    
    if (response.ok) {
      alert('Wishlist moved to pending');
      window.location.reload();
    } else {
      alert('Failed to move wishlist to pending');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.deleteWishlist = async function(id) {
  if (!confirm('Are you sure you want to DELETE this wishlist? This action CANNOT be undone.')) return;
  
  try {
    const basePath = window.location.pathname.includes('/oss-wishlist-website') ? '/oss-wishlist-website/' : '/';
    const response = await fetch(`${basePath}api/admin/delete-wishlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    
    if (response.ok) {
      alert('Wishlist deleted');
      window.location.reload();
    } else {
      alert('Failed to delete wishlist');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};
