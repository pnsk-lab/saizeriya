
$(function(){
	console.log("ready");
	
	//ボディの高さを調整
	body = $('#footer').offset().top - ($('#header').offset().top + $('#header').height()) - (Number($('#body-section').css('padding-top').replace('px', '')) + Number($('#body-section').css('padding-bottom').replace('px', '')));
	$('#body-section').height(body);
	
	//各プロシージャ呼出
	if(typeof onReadyExpand == 'function')
		onReadyExpand();
	
	// imgタグにtitleを追加する
	$("img[alt],a[alt],div[alt],li[alt],area[alt]").each(function(){
		var a=$(this).attr("alt");
		if(a.length>0&&!$(this).attr("title")){
			$(this).attr("title",a);
		}
	});
});

//メッセージボックス表示時のスクロール無効化
function handleTouchMove(event) {
	if(!isPinchZooming()){
		event.preventDefault();
	}
}

//ピンチズームされているかを調べる
function isPinchZooming() {
	if ('visualViewport' in window) {
		return window.visualViewport.scale > 1
	} else {
		return document.documentElement.clientWidth > window.innerWidth
	}
}

//スクロール制御
var scrollPos = 0;
function disableScroll(reset = true) {
	if(reset){
		scrollPos = $(window).scrollTop();
		$('body').css({
			'position': 'fixed',
			'width': '100%',
			'z-index': '1',
			'top': -scrollPos
		});
	}
	else{
		$('body').css({
			'position': 'relative',
			'width': 'auto',
			'top': 'auto'
		});
		$('html, body').scrollTop(scrollPos);
	}
}

$(window).on('load', function(){
	console.log("load");

	//メッセージボックス定義
	$.alert = function(message){
		var dfd = $.Deferred();
		// ダイアログを作成
		var dlg = $("<div></div>").dialog({
			modal: true,
			width: '80vw',
			position: {my: "center center", at: "center center", of: "#base-overlay"},
			appendTo: "#base-overlay",
			buttons: {
				"OK": function(){
					$(this).dialog("close");
					dfd.resolve();
				}
			},
			close: function() {
				disableScroll(false);
				//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
				$('#base-overlay').remove();
			}
		});
		dlg.html(message);
		return dfd.promise();
	};

	$.confirm = function(message, reverse){
		var dfd = $.Deferred();
		// ダイアログを作成
		if(!reverse){
			var dlg = $("<div></div>").dialog({
				modal: true,
				width: '80vw',
				position: {my: "center center", at: "center center", of: "#base-overlay"},
				appendTo: "#base-overlay",
				buttons: {
					"いいえ": function(event, ui){
						$(this).dialog("close");
						dfd.resolve("cancel");
					},
					"はい": function(){
						$(this).dialog("close");
						dfd.resolve("yes");
					}
				},
				close: function() {
					disableScroll(false);
					//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
					$('#base-overlay').remove();
				}
			});
		}
		else{
			var dlg = $("<div></div>").dialog({
				modal: true,
				width: '80vw',
				position: {my: "center center", at: "center center", of: "#base-overlay"},
				appendTo: "#base-overlay",
				buttons: {
					"はい": function(){
						$(this).dialog("close");
						dfd.resolve("yes");
					},
					"いいえ": function(event, ui){
						$(this).dialog("close");
						dfd.resolve("cancel");
					}
				},
				close: function() {
					disableScroll(false);
					//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
					$('#base-overlay').remove();
				}
			});
		}
		dlg.html(message);
		return dfd.promise();
	};

	window.old_alert = window.alert;
	window.alert =  function(message, okCallback=function(){}){
		if($('body').find('#base-overlay').length > 0)
			return;
		$('body').append('<div id="base-overlay" class="ui-widget-overlay ui-front" style="z-index: 9999998;"></div>');
		disableScroll();
		//document.addEventListener('touchmove', handleTouchMove, { passive: false });
		$.alert(message)
		.then(function(status){
			okCallback();
			disableScroll(false);
			//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
			$('#base-overlay').remove();
		});
		//一番後ろのボタンにフォーカス
		$('.ui-dialog-buttonset>button:last-child').focus();
	}
	window.old_confirm = window.confirm;
	window.confirm =  function(message, okCallback, cancelCallback=function(){}, reverse=false){
		if($('body').find('#base-overlay').length > 0)
			return;
		$('body').append('<div id="base-overlay" class="ui-widget-overlay ui-front" style="z-index: 9999998;"></div>');
		disableScroll();
		//document.addEventListener('touchmove', handleTouchMove, { passive: false });
		$.confirm(message, reverse)
		.then(function(status){
			var ret = (status === "yes");
			if(ret)
				okCallback();
			else
				cancelCallback();
			disableScroll(false);
			//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
			$('#base-overlay').remove();
		});
		//一番後ろのボタンにフォーカス
		$('.ui-dialog-buttonset>button:last-child').focus();
	}

	//タイトル点滅
	$('div#header>h1').addClass('blinking');

	//各プロシージャ呼出
	if(typeof onLoadExpand == 'function')
		onLoadExpand();

	//メッセージがあれば表示（スクロール完成後に表示の為ディレイ処理）
	if($('#message').val() != ''){
		setTimeout(function(){
			alert($('#message').val());
			$('#message').val('');
		},100);
	}
/*	if($('.notice-balloon:not(.show)').length > 0){
		setTimeout(function(){
			$('.notice-balloon').addClass('show');
			$('#notice-sound')[0].currentTime = 0;
			$('#notice-sound')[0].play();
		},100);
	}*/
});

$(window).on('orientationchange resize', function() {
	console.log("orientationchange resize");
	
	//ボディの高さを調整
	body = $('#footer').offset().top - ($('#header').offset().top + $('#header').height()) - (Number($('#body-section').css('padding-top').replace('px', '')) + Number($('#body-section').css('padding-bottom').replace('px', '')));
	$('#body-section').height(body);
	
	//各プロシージャ呼出
	if(typeof onResizeExpand == 'function')
		onResizeExpand();
});

$(window).scroll(function(){
	console.log("scroll");
	
	// 「ページトップへ」を表示
	if($(this).scrollTop()>100){
		$("#pagetop").fadeIn();
	}else{
		$("#pagetop").fadeOut();
	}
	
	//各プロシージャ呼出
	if(typeof onScrollExpand == 'function')
		onScrollExpand();
});
        
// 「ページトップへ」クリック時
$(document).on({'click': function(){
	$("body,html").animate({scrollTop:0},300);
	return false;
}},'#pagetop');

// ヘッダー帯 クリック時
$(document).on({'click': function(){
	$('#proc').val('top');
	$('#frm_ctrl').submit();
	return false;
}},'#header>h1');

// スワイプ処理
var sd, sx, sy, ey;
$(window).on('touchstart', function(e){sx=e.originalEvent.touches[0].pageX;sy=e.originalEvent.touches[0].pageY;ey=e.originalEvent.touches[0].pageY;sd=''});
$(window).on('touchmove', function(e){if(sx-e.originalEvent.touches[0].pageX>100){sd='L'}else if(sx-e.originalEvent.touches[0].pageX<-100){sd='R'};ey=e.originalEvent.touches[0].pageY});
$(window).on('touchend', function(e){if($('#base-overlay').length) return; if(Math.abs(sy-ey)<25){if(sd=='R'){onSwipeRight()}else if(sd=='L'){onSwipeLeft()}}});

// 注文追加クリック時
$(document).on({'click': function(){
	if ($(this).hasClass('disabled'))
		return false;
		
	sid = String($('#shop-id').val()).trim();
	$.ajax({	
		url:"./src/cmd/check_lastorder.php",
		type:"POST",
		data:'sid=' + sid,
		dataType:"json",
		cache:false,
		timespan:1000
	}).done(function(data, textStatus, jqXHR){
		console.log(data);
		if (data['result'] == 'OK'){
			alert('ラストオーダーの時間を過ぎている為、注文を送信できません。', function() {
				$('#proc').val('account');
				$('#ctrl').val('clear');
				$('#frm_ctrl').submit();
			});
		}
		else{
			$('#proc').val('menu');
			$('#frm_ctrl').submit();
		}
	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log('error');
		$('#proc').val('menu');
		$('#frm_ctrl').submit();
	});
	
	return false;
}},'#order-add');

// 注文リストクリック時
$(document).on({'click': function(){
	if ($(this).hasClass('disabled'))
		return false;
		
	sid = String($('#shop-id').val()).trim();
	$.ajax({	
		url:"./src/cmd/check_lastorder.php",
		type:"POST",
		data:'sid=' + sid,
		dataType:"json",
		cache:false,
		timespan:1000
	}).done(function(data, textStatus, jqXHR){
		console.log(data);
		if (data['result'] == 'OK'){
			alert('ラストオーダーの時間を過ぎている為、注文を送信できません。', function() {
				$('#proc').val('account');
				$('#ctrl').val('clear');
				$('#frm_ctrl').submit();
			});
		}
		else{
			$('#proc').val('main');
			$('#frm_ctrl').submit();
		}
	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log('error');
		$('#proc').val('main');
		$('#frm_ctrl').submit();
	});
	
	return false;
}},'#order-list');

// 注文履歴クリック時
$(document).on({'click': function(){
	if (!$(this).hasClass('disabled')){
		$('#proc').val('history');
		$('#frm_ctrl').submit();
	}
	return false;
}},'#order-history');

// 店員呼出クリック時
$(document).on({'click': function(){
	if (!$(this).hasClass('disabled')){
		$('#proc').val('call');
		$('#frm_ctrl').submit();
	}
	return false;
}},'#after-call');

// 会計クリック時
$(document).on({'click': function(){
	if (!$(this).hasClass('disabled')){
		$('#proc').val('account');
		$('#frm_ctrl').submit();
	}
	return false;
}},'#do-account');

// バルーンクリック時
$(document).on({'click': function(){
	$(this).parent().parent().removeClass('show');
	return false;
}},'.notice-balloon .ui-dialog-buttonset button');

function onReadyExpand(){
	console.log("ready");
	
}

function onLoadExpand(){
	console.log("load");
	
}

function onScrollExpand(){
	console.log("scroll");
	
}

function onResizeExpand() {
	console.log("orientationchange resize");
	
}

$('#sidemenu').scroll(function(){
	console.log("scroll_side");
	
});

function onSwipeLeft(){
    console.log('left swipe');
	
}
function onSwipeRight(){
    console.log('right swipe');
	
}

// 「○人以上」クリック時
$(document).on({'click': function(){
	//idから値を取得
	num = parseInt($(this).attr('id').substr(2));
	
	//値をチェック
	if (num < 1 || 8 < num){
		alert("正しい人数を選択してください。");
		return false;
	}
	
	//最終確認
	confirm(sprintf('%d名様でご利用ですね？', num), function() {
		//値をセットする
		$('#number').val(num);
		
		$('#proc').val('menu');
		$('#ctrl').val('number');
		$('#frm_ctrl').submit();
	});
	
	return false;
}},'.btn.num:not(.ent)');

// 「9人以上」クリック時
$(document).on({'click': function(){
	if (!$('.number').hasClass("enter")){
		$('.number').addClass("enter")
	}
	return false;
}},'.btn.num.ent');

// 「戻る」クリック時
$(document).on({'click': function(){
	if ($('.number').hasClass("enter")){
		$('.number').removeClass("enter")
	}
	return false;
}},'#back');

// 「確定」クリック時
$(document).on({'click': function(){
	//入力ボックスから値を取得
	num = parseInt($('#nox').val());
	
	//入力ボックスの値をチェック
	if (isNaN(num) || num < 1 || 99 < num){
		alert("1～99人で入力してください。");
		$('#nox').focus().get(0).select();
		return false;
	}
	
	//最終確認
	confirm(sprintf('%d名様でご利用ですね？', num), function() {
		//値をセットする
		$('#number').val(num);
		
		$('#proc').val('menu');
		$('#ctrl').val('number');
		$('#frm_ctrl').submit();
	});
	
	return false;
}},'#decide');