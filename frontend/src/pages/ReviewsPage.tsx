import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, Clock, MessageSquare, Filter, ChevronDown, Send, AlertTriangle } from 'lucide-react';
import { ReviewsApi, Review } from '../services/api';
import { useNavigate } from 'react-router-dom';

const ReviewsPage = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'upvotes' | 'recent'>('upvotes');
    const [showForm, setShowForm] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReviews();
    }, [sortBy]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const data = await ReviewsApi.getReviews({ sort: sortBy });
            setReviews(data);
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
            setError('Failed to load reviews. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (id: string, type: 'up' | 'down') => {
        try {
            await ReviewsApi.voteReview(id, type);
            // Optimistic update
            setReviews(prev => prev.map(r => {
                if (r.id === id) {
                    return { ...r, upvotes: r.upvotes + (type === 'up' ? 1 : -1) };
                }
                return r;
            }));
        } catch (err) {
            console.error('Vote failed:', err);
            // Revert or show toast
        }
    };

    const handleFlag = async (id: string) => {
        if (!window.confirm('Report this review as inappropriate?')) return;
        try {
            await ReviewsApi.flagReview(id);
            alert('Review reported. Thank you for keeping the community safe.');
            // Optimistic update or refetch
            setReviews(prev => prev.map(r => {
                if (r.id === id) {
                    return { ...r, flag_count: r.flag_count + 1 };
                }
                return r;
            }));
        } catch (err) {
            console.error('Flag failed:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus('submitting');
        try {
            await ReviewsApi.createReview(newReview);
            setSubmitStatus('success');
            setNewReview({ rating: 5, comment: '' });
            setShowForm(false);
            fetchReviews(); // Refresh list
            setTimeout(() => setSubmitStatus('idle'), 3000);
        } catch (err) {
            console.error('Submit failed:', err);
            setSubmitStatus('error');
        }
    };

    return (
        <div className="bg-[#0A0E14] min-h-screen text-white font-sans">
            {/* Navbar */}
            <nav className="border-b border-[#2A3142] bg-[#131820] sticky top-0 z-50 p-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/landing')}>
                        <span className="text-[#00FF41] font-bold text-xl">MATRIX</span>
                        <span className="text-sm font-mono text-gray-400">REVIEWS</span>
                    </div>
                    <button onClick={() => navigate('/landing')} className="text-gray-400 hover:text-white">Back to Landing</button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Voice of the People</h1>
                        <p className="text-[#A0AEC0]">Trusted experiences from the Matrix network.</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-6 py-3 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg hover:shadow-lg transition-all"
                    >
                        {showForm ? 'Cancel Review' : 'Write a Review'}
                    </button>
                </div>

                {/* Submit Form */}
                {showForm && (
                    <div className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] mb-8 animate-fade-in">
                        <h3 className="text-lg font-bold mb-4">Share your experience</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm text-[#A0AEC0] mb-2">Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setNewReview({ ...newReview, rating: star })}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <Star className={`w-8 h-8 ${star <= newReview.rating ? 'text-[#FFB800] fill-[#FFB800]' : 'text-[#2A3142]'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm text-[#A0AEC0] mb-2">Comment</label>
                                <textarea
                                    className="w-full bg-[#0A0E14] border border-[#2A3142] rounded-lg p-3 text-white focus:border-[#00FF41] outline-none min-h-[100px]"
                                    placeholder="Tell us about your delivery..."
                                    value={newReview.comment}
                                    onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitStatus === 'submitting'}
                                className="w-full py-3 bg-[#00FF41] text-[#0A0E14] font-bold rounded-lg disabled:opacity-50 hover:bg-[#00CC33] transition-colors"
                            >
                                {submitStatus === 'submitting' ? 'Transmitting...' : 'Submit Review'}
                            </button>
                            {submitStatus === 'success' && <p className="text-[#00FF41] mt-2 flex items-center gap-2"><Send className="w-4 h-4" /> Review submitted successfully</p>}
                            {submitStatus === 'error' && <p className="text-red-500 mt-2">Failed to submit. Please try again.</p>}
                        </form>
                    </div>
                )}

                {/* Filters */}
                <div className="flex justify-between items-center mb-6 bg-[#131820] p-4 rounded-lg border border-[#2A3142]">
                    <div className="flex items-center gap-2 text-[#A0AEC0]">
                        <Filter className="w-5 h-5" />
                        <span className="font-mono text-sm block">SORT BY:</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setSortBy('upvotes')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sortBy === 'upvotes' ? 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]' : 'text-[#A0AEC0] hover:text-white'}`}
                        >
                            Highest Upvotes
                        </button>
                        <button
                            onClick={() => setSortBy('recent')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sortBy === 'recent' ? 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]' : 'text-[#A0AEC0] hover:text-white'}`}
                        >
                            Most Recent
                        </button>
                    </div>
                </div>

                {/* Review List */}
                {loading ? (
                    <div className="text-center py-20 text-[#00FF41] animate-pulse">Initializing Matrix data stream...</div>
                ) : (
                    <div className="space-y-4">
                        {reviews?.length === 0 && <p className="text-center text-[#A0AEC0] py-10">No signals detected yet. Be the first to broadcast.</p>}
                        {reviews?.map(review => (
                            <div key={review.id} className="bg-[#131820] p-6 rounded-xl border border-[#2A3142] hover:border-[#00FF41] transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A3142] to-[#131820] border border-[#2A3142] flex items-center justify-center font-bold text-[#00FF41]">
                                            {review.user_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{review.user_name}</p>
                                            <p className="text-xs text-[#64748B] flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(review.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 bg-[#0A0E14] px-3 py-1 rounded-full border border-[#2A3142]">
                                        <Star className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />
                                        <span className="font-bold text-[#FFB800]">{review.rating.toFixed(1)}</span>
                                    </div>
                                </div>

                                <p className="text-[#E2E8F0] mb-6 leading-relaxed">
                                    {review.comment}
                                </p>

                                <div className="flex items-center justify-between border-t border-[#2A3142] pt-4 mt-2">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleVote(review.id, 'up')}
                                            className="flex items-center gap-2 text-[#A0AEC0] hover:text-[#00FF41] transition-colors group/vote"
                                        >
                                            <ThumbsUp className="w-4 h-4 group-hover/vote:scale-110 transition-transform" />
                                            <span className="text-sm font-mono">{review.upvotes}</span>
                                        </button>
                                        {/* BDD Requirement: See Flags */}
                                        <div className="flex items-center gap-2 text-[#64748B]" title="Flag Count">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span className="text-sm font-mono">{review.flag_count}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleFlag(review.id)}
                                        className="text-[#64748B] hover:text-red-500 transition-colors flex items-center gap-1 text-xs"
                                    >
                                        <Flag className="w-3 h-3" /> Report
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewsPage;
