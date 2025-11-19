// Admin page functions for approving/rejecting wishlists and practitioners
// Uses event delegation for security (no inline onclick handlers)

// Event delegation handler
document.addEventListener('DOMContentLoaded', () => {
  // Handle all button clicks via event delegation
  document.body.addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const id = parseInt(button.dataset.id, 10);

    if (!id) return;

    switch (action) {
      case 'approve-wishlist':
        await approveWishlist(id);
        break;
      case 'reject-wishlist':
        await rejectWishlist(id);
        break;
      case 'move-to-pending':
        await moveToPending(id);
        break;
      case 'delete-wishlist':
        await deleteWishlist(id);
        break;
      case 'approve-practitioner':
        await approvePractitioner(id);
        break;
      case 'reject-practitioner':
        await rejectPractitioner(id);
        break;
    }
  });
});

async function approveWishlist(id) {
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
}

async function rejectWishlist(id) {
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
}

async function approvePractitioner(id) {
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
}

async function rejectPractitioner(id) {
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
}

async function moveToPending(id) {
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
}

async function deleteWishlist(id) {
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
}
